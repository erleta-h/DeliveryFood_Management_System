using DotNetEnv;
using FoodDelivery.Api.Security;
using FoodDelivery.Application;
using FoodDelivery.Application.Abstractions;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Security;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;

Env.TraversePath();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var jwtSettingsSection = builder.Configuration.GetSection(JwtSettings.SectionName);
var jwtSecret = jwtSettingsSection["Secret"] ?? string.Empty;

if (jwtSecret.Length < 32)
    throw new InvalidOperationException(
        "Jwt:Secret duhet të jetë së paku 32 karaktere. Vendose në .env si Jwt__Secret ose në User Secrets (mos e commit-o).");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = true;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettingsSection["Issuer"],
        ValidAudience = jwtSettingsSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.FromMinutes(2),
        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var path = context.HttpContext.Request.Path;

            if (path.StartsWithSegments("/hubs"))
            {
                var accessToken = context.Request.Query["access_token"].ToString();

                if (!string.IsNullOrEmpty(accessToken))
                    context.Token = accessToken;
            }

            return Task.CompletedTask;
        },
    };
});

builder.Services.AddAuthorization(options =>
{
    foreach (var perm in PermissionNames.All)
    {
        options.AddPolicy(PermissionPolicies.For(perm), policy =>
        {
            policy.RequireRole("Admin", "Support");
            policy.RequireClaim(PermissionClaimTypes.Permission, perm);
        });
    }
});

builder.Services.AddSignalR().AddJsonProtocol(o =>
{
    o.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "FoodDelivery API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Vendos JWT: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
            },
            Array.Empty<string>()
        },
    });
});

var corsSection = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy
                .SetIsOriginAllowed(static origin =>
                {
                    if (string.IsNullOrWhiteSpace(origin))
                        return false;

                    try
                    {
                        var uri = new Uri(origin);
                        return uri.Host is "localhost" or "127.0.0.1";
                    }
                    catch (UriFormatException)
                    {
                        return false;
                    }
                })
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else if (corsSection is { Length: > 0 })
        {
            policy.WithOrigins(corsSection).AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var app = builder.Build();

var autoMigrate = builder.Configuration.GetValue("Database:AutoMigrate", defaultValue: true);

if (autoMigrate)
{
    try
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FoodDeliveryDbContext>();
        var dbLog = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbStartup");
       

        await db.Database.MigrateAsync();

        dbLog.LogInformation("Migrimet EF u aplikuan — skema e databazës përputhet me projektin.");

        await DbSeeder.EnsureRbacAndCmsDefaultsAsync(db, dbLog);

        if (app.Environment.IsDevelopment())
        {
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            await DbSeeder.SeedAsync(db, dbLog, passwordHasher);
        }
    }
    catch (Exception ex)
    {
        var dbLog = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("DbStartup");

        if (ex.GetBaseException() is SqlException sql && sql.Number == 2714)
        {
            dbLog.LogCritical(
                "Migrimi u ndal sepse u përpoq të krijonte një tabelë që ekziston tashmë.");
        }

        dbLog.LogCritical(ex,
            "Dështoi migrimi (ose seed në Development). Kontrollo ConnectionStrings:DefaultConnection dhe SQL Server.");

        throw;
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FoodDelivery v1");
    });
}

app.UseCors();

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.MapHub<OrderTrackingHub>("/hubs/orders");
app.MapControllers();

app.Run();