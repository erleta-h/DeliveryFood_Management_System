namespace FoodDelivery.Application.Configuration;

public sealed class SupportAttachmentStorageOptions
{
    public const string SectionName = "SupportAttachmentStorage";

    public string RelativeRoot { get; set; } = "App_Data/support-attachments";

    public long MaxFileBytes { get; set; } = 5 * 1024 * 1024;

    public int MaxAttachmentsPerTicket { get; set; } = 10;
}
