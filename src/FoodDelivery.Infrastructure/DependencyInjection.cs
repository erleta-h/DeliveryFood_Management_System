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
using FoodDelivery.Application.Favorites;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Maps;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Partners;
using FoodDelivery.Application.Payments;
using FoodDelivery.Application.Realtime;
using FoodDelivery.Application.Restaurants;
using FoodDelivery.Application.SiteContent;
using FoodDelivery.Application.Support;
using FoodDelivery.Infrastructure.Admin;
using FoodDelivery.Infrastructure.Favorites;
using FoodDelivery.Infrastructure.Maps;
using FoodDelivery.Infrastructure.Mongo;
using FoodDelivery.Infrastructure.Orders;
using FoodDelivery.Infrastructure.Partners;
using FoodDelivery.Infrastructure.Payments;
using FoodDelivery.Infrastructure.Realtime;
using FoodDelivery.Infrastructure.Restaurants;
using FoodDelivery.Infrastructure.SiteContent;
using FoodDelivery.Infrastructure.Support;

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
        services.AddScoped<IAdminNotificationService, AdminNotificationService>();
        services.AddScoped<INotificationPublisher, NotificationPublisher>();
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenIssuer, JwtTokenIssuer>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminDashboardService, AdminDashboardService>();
        services.AddScoped<IAdminPartnerApplicationService, AdminPartnerApplicationService>();
        services.AddScoped<IAdminDriverApplicationService, AdminDriverApplicationService>();
        services.AddScoped<IAdminRestaurantsService, AdminRestaurantsService>();
        services.AddScoped<IAdminFoodCategoriesService, AdminFoodCategoriesService>();
        services.AddScoped<IAdminOrdersService, AdminOrdersService>();
        services.AddScoped<IAdminDriversService, AdminDriversService>();
        services.AddScoped<IAdminZonesService, AdminZonesService>();
        services.AddScoped<IAdminCustomersService, AdminCustomersService>();
        services.AddScoped<IAdminSupportTicketService, AdminSupportTicketService>();
        services.AddScoped<IAdminFinanceService, AdminFinanceService>();
        services.AddScoped<IAdminCouponsService, AdminCouponsService>();
        services.AddScoped<IAdminReviewsService, AdminReviewsService>();
        services.AddScoped<IAdminReportsService, AdminReportsService>();
        services.AddScoped<IAdminDataPortService, AdminDataPortService>();
        services.AddScoped<IAdminAuditService, AdminAuditService>();
        services.AddScoped<IAdminSettingsService, AdminSettingsService>();
        services.AddScoped<IAdminCmsService, AdminCmsService>();
        services.AddScoped<IPublicSiteContentService, PublicSiteContentService>();
        services.AddScoped<IPartnerApplicationService, PartnerApplicationService>();
        services.AddScoped<IDriverApplicationService, DriverApplicationService>();
        services.AddScoped<IFavoriteRestaurantsService, FavoriteRestaurantsService>();
        services.AddScoped<IRestaurantCatalogService, RestaurantCatalogService>();
        services.AddScoped<IOrdersService, OrdersService>();
        services.AddScoped<IKitchenOrdersService, KitchenOrdersService>();
        services.AddScoped<IKitchenMenuService, KitchenMenuService>();
        services.AddScoped<IDriverDeliveryService, DriverDeliveryService>();
        services.AddScoped<IDeliveryAutoDispatchService, DeliveryAutoDispatchService>();
        services.AddScoped<IOrderRealtimeNotifier, OrderFanOutNotifier>();
        services.AddScoped<IPushNotificationSender, WebPushNotificationSender>();
        services.AddScoped<IWebPushSubscriptionService, WebPushSubscriptionService>();
        services.AddScoped<ISupportTicketService, SupportTicketService>();
        services.AddScoped<IStripePaymentService, StripePaymentService>();
        services.AddHttpClient(GoogleMapsDistanceService.HttpClientName);
        services.AddScoped<IGoogleMapsDistanceService, GoogleMapsDistanceService>();
        services.AddScoped<ICustomerDrivingPreviewService, CustomerDrivingPreviewService>();
        services.Configure<GoogleMapsSettings>(configuration.GetSection(GoogleMapsSettings.SectionName));
        services.Configure<StripeSettings>(configuration.GetSection(StripeSettings.SectionName));
        services.Configure<WebPushSettings>(configuration.GetSection(WebPushSettings.SectionName));
        services.Configure<MenuImageStorageOptions>(configuration.GetSection(MenuImageStorageOptions.SectionName));

        services.AddDistributedMemoryCache();
        services.AddMongoDb(configuration);
        services.AddScoped<IDeliveryChatService, DeliveryChatService>();

        return services;
    }
}
