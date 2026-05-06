namespace FoodDelivery.Application.Security;

/// <summary>Emra politikash për [Authorize(Policy = …)] — duhet të jenë konstante kompilimi.</summary>
public static class PermissionPolicyNames
{
    public const string AdminDashboard = "Perm:admin.dashboard";
    public const string AdminPartnerApplications = "Perm:admin.partner_applications";
    public const string AdminDriverApplications = "Perm:admin.driver_applications";
    public const string AdminRestaurants = "Perm:admin.restaurants";
    public const string AdminFoodCategories = "Perm:admin.food_categories";
    public const string AdminOrders = "Perm:admin.orders";
    public const string AdminCustomers = "Perm:admin.customers";
    public const string AdminFinance = "Perm:admin.finance";
    public const string AdminCoupons = "Perm:admin.coupons";
    public const string AdminReviews = "Perm:admin.reviews";
    public const string AdminZones = "Perm:admin.zones";
    public const string AdminDrivers = "Perm:admin.drivers";
    public const string AdminAudit = "Perm:admin.audit";
    public const string AdminSettings = "Perm:admin.settings";
    public const string AdminSupport = "Perm:admin.support";
    public const string AdminReports = "Perm:admin.reports";
    public const string AdminDataPort = "Perm:admin.data_port";
    public const string AdminCms = "Perm:admin.cms";
}
