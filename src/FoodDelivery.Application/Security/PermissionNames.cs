namespace FoodDelivery.Application.Security;

/// <summary>Emra të qëndrueshëm të lejeve — përputhen me rreshtat në tabelën permissions dhe me claim në JWT.</summary>
public static class PermissionNames
{
    public const string AdminDashboard = "admin.dashboard";
    public const string AdminPartnerApplications = "admin.partner_applications";
    public const string AdminDriverApplications = "admin.driver_applications";
    public const string AdminRestaurants = "admin.restaurants";
    public const string AdminFoodCategories = "admin.food_categories";
    public const string AdminOrders = "admin.orders";
    public const string AdminCustomers = "admin.customers";
    public const string AdminFinance = "admin.finance";
    public const string AdminCoupons = "admin.coupons";
    public const string AdminReviews = "admin.reviews";
    public const string AdminZones = "admin.zones";
    public const string AdminDrivers = "admin.drivers";
    public const string AdminAudit = "admin.audit";
    public const string AdminSettings = "admin.settings";
    public const string AdminSupport = "admin.support";
    public const string AdminReports = "admin.reports";
    public const string AdminDataPort = "admin.data_port";
    public const string AdminCms = "admin.cms";

    public static readonly IReadOnlyList<string> All = new[]
    {
        AdminDashboard,
        AdminPartnerApplications,
        AdminDriverApplications,
        AdminRestaurants,
        AdminFoodCategories,
        AdminOrders,
        AdminCustomers,
        AdminFinance,
        AdminCoupons,
        AdminReviews,
        AdminZones,
        AdminDrivers,
        AdminAudit,
        AdminSettings,
        AdminSupport,
        AdminReports,
        AdminDataPort,
        AdminCms,
    };
}
