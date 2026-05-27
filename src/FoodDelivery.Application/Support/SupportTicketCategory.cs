namespace FoodDelivery.Application.Support;

public static class SupportTicketCategory
{
    public const int Delay = 0;
    public const int MissingItem = 1;
    public const int WrongFood = 2;
    public const int Refund = 3;
    public const int DriverIssue = 4;
    public const int PaymentIssue = 5;
    public const int Other = 6;

    public static readonly IReadOnlyDictionary<int, string> Labels = new Dictionary<int, string>
    {
        [Delay] = "Vonesë",
        [MissingItem] = "Artikull mungon",
        [WrongFood] = "Ushqim i gabuar",
        [Refund] = "Rimbursim",
        [DriverIssue] = "Problem me driverin",
        [PaymentIssue] = "Problem me pagesë",
        [Other] = "Tjetër",
    };

    public static bool IsValid(int value) => value is >= 0 and <= 6;
}
