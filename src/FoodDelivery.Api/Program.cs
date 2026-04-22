using System.Text;
using DotNetEnv;
using FoodDelivery.Api.Security;
using FoodDelivery.Application;
using FoodDelivery.Application.Abstractions;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure;
using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// Sekretet dhe connection string: .env (ngjitur me rrënjën e solution) ose User Secrets — mos i commit-o.
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
}).AddJwtBearer(options =>
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
});

builder.Services.AddAuthorization();

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
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
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
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
                    if (string.IsNullOrWhiteSpace(origin)) return false;
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
            policy.WithOrigins(corsSection).AllowAnyHeader().AllowAnyMethod();
        else
            policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod();
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
        // Aplikon të gjitha migrimet e pazbatuara (çdo migrim i ri shtohet këtu automatikisht).
        await db.Database.MigrateAsync();
        dbLog.LogInformation("Migrimet EF u aplikuan — skema e databazës përputhet me projektin.");

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
                "Migrimi u ndal sepse u përpoq të krijonte një tabelë (p.sh. FoodCategories) që ekziston tashmë. " +
                "Kjo zakonisht ndodh kur skema e databazës u krijua më parë, por tabela __EFMigrationsHistory nuk " +
                "përputhet me migrimet në kod (migrim i «InitialCreate» u ndryshua ose u ribë, ose baza u kopjua pa historinë). " +
                "Hapat tipikë: (1) në zhvillim, fshi databazën dhe nis sërish që Migrate të krijojë skemën nga e para; " +
                "ose (2) shto manualisht rreshtat në __EFMigrationsHistory për migrimet e zbatuara, sipas " +
                "dokumentimit EF, nëse dëshiron të ruash të dhënat.");
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
app.MapControllers();

app.Run();
