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
using FoodDelivery.Application.Admin;
using FoodDelivery.Application.SiteContent;
using FoodDelivery.Infrastructure.Admin;
using FoodDelivery.Infrastructure.SiteContent;
using FoodDelivery.Application.Orders;
using FoodDelivery.Infrastructure.Maps;     
using FoodDelivery.Infrastructure.Mongo;
using FoodDelivery.Infrastructure.Orders;
using FoodDelivery.Infrastructure.Payments;

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
        services.AddScoped<IAdminCmsService, AdminCmsService>();
        services.AddScoped<IPublicSiteContentService, PublicSiteContentService>();
        services.Configure<GoogleMapsSettings>(configuration.GetSection(GoogleMapsSettings.SectionName));
        services.Configure<StripeSettings>(configuration.GetSection(StripeSettings.SectionName));
        services.Configure<WebPushSettings>(configuration.GetSection(WebPushSettings.SectionName));

        services.AddDistributedMemoryCache();
        services.AddMongoDb(configuration);
        services.AddScoped<IDeliveryChatService, DeliveryChatService>();

        return services;
    }
}
