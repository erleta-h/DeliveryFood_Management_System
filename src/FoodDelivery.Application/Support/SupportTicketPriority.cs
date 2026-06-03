namespace FoodDelivery.Application.Support;

public static class SupportTicketPriority
{
    public const int Low = 0;
    public const int Medium = 1;
    public const int High = 2;
    public const int Urgent = 3;

    public static readonly IReadOnlyDictionary<int, string> Labels = new Dictionary<int, string>
    {
        [Low] = "Ulët",
        [Medium] = "Mesatar",
        [High] = "Lartë",
        [Urgent] = "Urgjent",
    };

    public static int AutoFromCategory(int category) => category switch
    {
        SupportTicketCategory.Refund => High,
        SupportTicketCategory.PaymentIssue => High,
        _ => Medium,
    };

    public static bool IsValid(int value) => value is >= Low and <= Urgent;
}
