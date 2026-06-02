namespace FoodDelivery.Domain.Entities;

public class StoredFile
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Filename { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    /// <summary>Përdoruesi që ngarkoi skedarin (kolona <c>UploaderId</c> / <c>UploadedBy</c> në DB).</summary>
    public long UploaderId { get; set; }

    public User Uploader { get; set; } = null!;
}
