namespace FoodDelivery.Application.Admin;

public sealed record AdminAuditLogItemDto(
    long Id,
    DateTime CreatedAt,
    long? UserId,
    string? UserEmail,
    string Action,
    string Entity,
    string? EntityId,
    string? IpAddress);

public sealed record AdminAuditLogListResultDto(
    IReadOnlyList<AdminAuditLogItemDto> Items,
    int Total,
    int Page,
    int PageSize);
