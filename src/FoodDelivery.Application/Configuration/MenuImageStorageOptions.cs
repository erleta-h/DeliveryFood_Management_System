namespace FoodDelivery.Application.Configuration;

// Ruajtja e fotove të artikujve të menysë në disk (ContentRoot).
public sealed class MenuImageStorageOptions
{
    public const string SectionName = "MenuImageStorage";

    // Rruga relative ndaj ContentRoot,
    public string RelativeRoot { get; set; } = "App_Data/menu-images";

    public long MaxFileBytes { get; set; } = 5 * 1024 * 1024;
}
