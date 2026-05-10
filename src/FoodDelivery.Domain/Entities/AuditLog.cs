namespace FoodDelivery.Domain.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string Entity { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? IpAddress { get; set; }
    public string? NewValue { get; set; }
    public string? OldValue { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    /// <summary>Përdoruesi që kryen veprimin (audit trail).</summary>
    public long? UserId { get; set; }
    public User? User { get; set; }
}
