namespace FoodDelivery.Domain.Entities;

/// <summary>Foto/skedar i bashkëngjitur te tiketa ose një mesazh në thread.</summary>
public class SupportTicketAttachment
{
    public long Id { get; set; }
    public long SupportTicketId { get; set; }
    /// <summary>Null = bashkëngjitur te mesazhi fillestar i tiketës.</summary>
    public long? MessageId { get; set; }
    public long StoredFileId { get; set; }
    public long UploadedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public SupportTicket SupportTicket { get; set; } = null!;
    public SupportTicketMessage? Message { get; set; }
    public StoredFile StoredFile { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}
