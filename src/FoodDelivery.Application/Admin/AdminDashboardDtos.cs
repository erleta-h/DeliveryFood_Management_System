namespace FoodDelivery.Application.Admin;

public sealed record AdminTopRestaurantDto(string Name, int OrderCount);

public sealed record AdminBusyHourDto(int HourUtc, int OrderCount);

public sealed record AdminDashboardDto(
    int PendingPartnerApplications,
    int ActiveRestaurants,
    int OrdersToday,
    int OrdersThisWeek,
    int OrdersThisMonth,
    decimal RevenueToday,
    decimal RevenueThisWeek,
    decimal RevenueThisMonth,
    IReadOnlyList<AdminTopRestaurantDto> TopRestaurantsThisMonth,
    IReadOnlyList<AdminBusyHourDto> BusiestHoursToday);
