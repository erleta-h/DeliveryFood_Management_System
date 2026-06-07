namespace FoodDelivery.Infrastructure.Partners;

internal static class PartnerApplicationContractFileHelper
{
    internal const long MaxFileBytes = 10 * 1024 * 1024;
    internal const string EntityName = "PartnerApplication";
    internal const string ContractKind = "contract";

    internal static string RelativeRoot { get; } = "App_Data/partner-applications";

    internal static string EntityId(long applicationId) => $"{applicationId}:{ContractKind}";

    internal static string? ValidatePdf(string fileName, long sizeBytes)
    {
        if (!string.Equals(Path.GetExtension(fileName), ".pdf", StringComparison.OrdinalIgnoreCase))
            return "Vetëm skedarë PDF lejohen.";
        if (sizeBytes <= 0 || sizeBytes > MaxFileBytes)
            return "PDF duhet të jetë maksimum 10 MB.";
        return null;
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
}
