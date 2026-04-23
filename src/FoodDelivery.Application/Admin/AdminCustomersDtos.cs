namespace FoodDelivery.Application.Admin;

public sealed record AdminCustomerListItemDto(
    long Id,
    string Email,
    string FirstName,
    string LastName,
    string? Phone,
    bool IsActive,
    int AddressCount,
    int OrderCount);

public sealed record AdminCustomerListResultDto(
    IReadOnlyList<AdminCustomerListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminCustomerSetActiveRequest(bool IsActive);
