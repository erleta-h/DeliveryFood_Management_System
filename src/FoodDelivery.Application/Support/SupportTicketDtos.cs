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
    int MessageCount,
    string? OrderNumber = null);

public sealed record CreateSupportTicketRequest(
    string Subject,
    string Body,
    int Category,
    long? OrderId = null,
    /// <summary>Nr. porosie si <c>FD-20260602-...</c> kur nuk dërgohet <see cref="OrderId"/> numerik.</summary>
    string? OrderNumber = null,
    long? RestaurantId = null,
    /// <summary>Opsional; nëse mungon ose është i pavlefshëm, përdoret auto nga kategoria.</summary>
    int? Priority = null);

public sealed record PostSupportTicketMessageRequest(string Body);

public sealed record SupportTicketMessageCreatedDto(long MessageId);

public sealed record SupportTicketAttachmentDto(
    long Id,
    long? MessageId,
    string FileName,
    DateTime CreatedAtUtc);

public sealed record SupportTicketMessageDto(
    long Id,
    long AuthorUserId,
    string AuthorEmail,
    bool IsStaffReply,
    string Body,
    DateTime CreatedAtUtc,
    IReadOnlyList<SupportTicketAttachmentDto> Attachments);

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
    IReadOnlyList<SupportTicketAttachmentDto> InitialAttachments,
    IReadOnlyList<SupportTicketMessageDto> Messages);

public sealed record SupportTicketAttachmentCreatedDto(long AttachmentId);

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

public sealed record SupportAgentDto(long Id, string Email, string DisplayName);

public sealed record SupportTicketAuditDto(
    long Id,
    long ActorUserId,
    string ActorEmail,
    string Action,
    DateTime CreatedAtUtc);
