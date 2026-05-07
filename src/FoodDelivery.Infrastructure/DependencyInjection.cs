using FoodDelivery.Application.Auth;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using FoodDelivery.Application.Notifications;
using FoodDelivery.Infrastructure.Notifications;

namespace FoodDelivery.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<FoodDeliveryDbContext>(options =>
            options.UseSqlServer(connectionString));
        services.AddScoped<ICustomerNotificationService, CustomerNotificationService>();
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenIssuer, JwtTokenIssuer>();
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
