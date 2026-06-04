using FoodDelivery.Application.Drivers;

namespace FoodDelivery.Infrastructure.Partners;

internal static class DriverApplicationFileHelper
{
    internal const long MaxFileBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExt = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf",
    };

    internal static string RelativeRoot { get; } = "App_Data/driver-applications";

    internal static string? ValidateExtension(string fileName)
    {
        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(ext) || !AllowedExt.Contains(ext))
            return "Formati i lejuar: JPEG, PNG, WebP, GIF ose PDF.";
        return null;
    }

    internal static string GuessContentType(string filename)
    {
        var ext = Path.GetExtension(filename).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream",
        };
    }

    internal static void TryDeletePhysical(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        try
        {
            if (File.Exists(path))
                File.Delete(path);
        }
        catch
        {
            /* ignore */
        }
    }

    internal static string EntityId(long applicationId, DriverApplicationDocumentKind kind) =>
        $"{applicationId}:{kind.ToString().ToLowerInvariant()}";
}
