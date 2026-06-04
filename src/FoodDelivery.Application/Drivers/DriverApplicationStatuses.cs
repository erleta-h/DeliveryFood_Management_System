namespace FoodDelivery.Application.Drivers;

public static class DriverApplicationStatuses
{
    public const byte Pending = 0;
    public const byte ApprovedWaitingActivation = 2;
    public const byte Active = 3;
    public const byte Rejected = 9;
}
