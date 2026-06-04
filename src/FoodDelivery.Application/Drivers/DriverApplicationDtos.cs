namespace FoodDelivery.Application.Drivers;

public record SubmitDriverApplicationRequest(
    string FirstName,
    string LastName,
    string Phone,
    string Email,
    string VehicleType,
    string? LicensePlate,
    string? Message);

public record DriverApplicationListQuery(
    string? Search,
    byte? Status,
    DateTime? FromUtc,
    DateTime? ToUtc);

public record DriverApplicationStatsDto(
    int Total,
    int Pending,
    int ApprovedWaitingActivation,
    int Active,
    int Rejected);

public record DriverApplicationListItemDto(
    long Id,
    DateTime CreatedAtUtc,
    int Status,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string VehicleType,
    string? LicensePlate);

public record ApproveDriverApplicationRequest;

public record ApproveDriverApplicationResultDto(
    string Email,
    bool ActivationEmailSent,
    DateTime? ActivationEmailSentAtUtc,
    string? DevActivationUrl);

public record RejectDriverApplicationRequest(string Reason);

public record ResendDriverActivationResultDto(
    bool Sent,
    DateTime? ActivationEmailSentAtUtc,
    string? DevActivationUrl);

public record DriverApplicationDocumentDto(
    string Kind,
    string Filename,
    long FileSize,
    string DownloadUrl);

public record DriverApplicationAuditEntryDto(
    string EventType,
    string? Detail,
    DateTime CreatedAtUtc,
    string? ActorName);

public record DriverApplicationDetailDto(
    long Id,
    DateTime CreatedAtUtc,
    int Status,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string? Message,
    string VehicleType,
    string? LicensePlate,
    string? RejectionReason,
    DateTime? ApprovedAtUtc,
    string? ApprovedByName,
    DateTime? ActivatedAtUtc,
    DateTime? ActivationEmailSentAtUtc,
    bool CanResendActivationEmail,
    string? DevActivationUrl,
    IReadOnlyList<DriverApplicationDocumentDto> Documents,
    IReadOnlyList<DriverApplicationAuditEntryDto> History);
