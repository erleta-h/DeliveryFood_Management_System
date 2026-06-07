namespace FoodDelivery.Application.Admin;

/// <summary>Moderim admin — përputhet me <c>Review.Status</c>.</summary>
public static class ReviewModerationStatus
{
    public const int Public = 0;
    public const int Hidden = 1;
    public const int Reported = 2;
}

public static class ReviewSubjectKind
{
    public const int Restaurant = 0;
    public const int Driver = 1;
}
