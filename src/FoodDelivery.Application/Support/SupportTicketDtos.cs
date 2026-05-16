namespace FoodDelivery.Application.Support;

public sealed record SupportTicketCreatedDto(long Id);

public sealed record SupportTicketMineItemDto(
    long Id,
    string Subject,
    int Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    int MessageCount);

public sealed record CreateSupportTicketRequest(
    string Subject,
    string Body,
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

/// <summary>Thread: <see cref="InitialBody"/> = mesazhi fillestar; <see cref="Messages"/> = përgjigjet.</summary>
public sealed record SupportTicketThreadDto(
    long Id,
    long UserId,
    string UserEmail,
    string Subject,
    string InitialBody,
    int Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    string? AdminNote,
    long? OrderId,
    string? OrderNumber,
    long? RestaurantId,
    string? RestaurantName,
    IReadOnlyList<SupportTicketMessageDto> Messages);

public sealed record AdminSupportTicketItemDto(
    long Id,
    long UserId,
    string UserEmail,
    string Subject,
    string Body,
    int Status,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    string? AdminNote,
    long? OrderId,
    string? OrderNumber,
    long? RestaurantId,
    string? RestaurantName,
    int MessageCount);

public sealed record AdminSupportTicketListResultDto(
    IReadOnlyList<AdminSupportTicketItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminUpdateSupportTicketRequest(int Status, string? AdminNote);
