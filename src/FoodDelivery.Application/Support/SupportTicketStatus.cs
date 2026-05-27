namespace FoodDelivery.Application.Support;

public static class SupportTicketStatus
{
    public const int Open = 0;
    public const int InReview = 1;
    public const int Resolved = 2;
    public const int Closed = 3;

    public static readonly IReadOnlyDictionary<int, string> Labels = new Dictionary<int, string>
    {
        [Open] = "Hapur",
        [InReview] = "Në shqyrtim",
        [Resolved] = "Zgjidhur",
        [Closed] = "Mbyllur",
    };
}
