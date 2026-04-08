using System.ComponentModel.DataAnnotations.Schema;

namespace FoodDelivery.Domain.Entities;

[Table("Files")]
public class StoredFile
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Filename { get; set; } = string.Empty;
    public long UploadedBy { get; set; }

    public User Uploader { get; set; } = null!;
}
