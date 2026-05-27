namespace FoodDelivery.Application.Support;

public sealed record SupportTicketCreatedDto(long Id);

public sealed record SupportTicketMineItemDto(
    long Id,
    string Subject,
    int Status,
    int Category,
    int Priority,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    DateTime? ResolvedAtUtc,
    int MessageCount);

public sealed record CreateSupportTicketRequest(
    string Subject,
    string Body,
    int Category,
    long? OrderId = null,
    long? RestaurantId = null);

public sealed record PostSupportTicketMessageRequest(string Body);

public sealed record SupportTicketMessageDto(
    long Id,
    long AuthorUserId,
    string AuthorEmail,
    bool IsStaffReply,
    string Body,
    DateTime CreatedAtUtc);

public sealed record SupportTicketThreadDto(
    long Id,
    long UserId,
    string UserEmail,
    string Subject,
    string InitialBody,
    int Status,
    int Category,
    int Priority,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    DateTime? ResolvedAtUtc,
    string? AdminNote,
    long? OrderId,
    string? OrderNumber,
    long? RestaurantId,
    string? RestaurantName,
    long? DriverId,
    string? DriverName,
    long? AssignedToUserId,
    string? AssignedToEmail,
    IReadOnlyList<SupportTicketMessageDto> Messages);

public sealed record AdminSupportTicketItemDto(
    long Id,
    long UserId,
    string UserEmail,
    string Subject,
    string Body,
    int Status,
    int Category,
    int Priority,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    DateTime? ResolvedAtUtc,
    string? AdminNote,
    long? OrderId,
    string? OrderNumber,
    long? RestaurantId,
    string? RestaurantName,
    long? DriverId,
    string? DriverName,
    long? AssignedToUserId,
    string? AssignedToEmail,
    int MessageCount);

public sealed record AdminSupportTicketListResultDto(
    IReadOnlyList<AdminSupportTicketItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminUpdateSupportTicketRequest(int Status, string? AdminNote);

public sealed record AssignTicketRequest(long AgentUserId);
public sealed record ChangePriorityRequest(int Priority);
public sealed record ChangeStatusRequest(int Status);

public sealed record SupportTicketAuditDto(
    long Id,
    long ActorUserId,
    string ActorEmail,
    string Action,
    DateTime CreatedAtUtc);
