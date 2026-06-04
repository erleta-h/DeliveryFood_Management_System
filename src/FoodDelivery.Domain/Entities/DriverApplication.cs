namespace FoodDelivery.Domain.Entities;

public class DriverApplication
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string VehicleType { get; set; } = string.Empty;
    public string? LicensePlate { get; set; }
    public string? Message { get; set; }

    public byte Status { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public long? UserId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? ActivatedAtUtc { get; set; }
    public DateTime? ActivationEmailSentAtUtc { get; set; }

    public User? User { get; set; }
    public User? UpdatedBy { get; set; }
    public ICollection<DriverApplicationAudit> Audits { get; set; } = new List<DriverApplicationAudit>();
}
