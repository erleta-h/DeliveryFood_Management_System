namespace FoodDelivery.Application.Admin;

public sealed record AdminCustomerListItemDto(
    long Id,
    string Email,
    string FirstName,
    string LastName,
    string? Phone,
    bool IsActive,
    int AddressCount,
    int OrderCount,
    DateTime CreatedAtUtc,
    DateTime? LastOrderAtUtc,
    string? LastOrderRestaurantName);

public sealed record AdminCustomerListResultDto(
    IReadOnlyList<AdminCustomerListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminCustomerStatsDto(
    int Total,
    int Active,
    int Blocked,
    int TotalAddresses,
    int NewThisWeek,
    int NewAddressesThisWeek);

public sealed record AdminCustomerSetActiveRequest(bool IsActive);
