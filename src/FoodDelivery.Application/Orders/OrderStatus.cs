namespace FoodDelivery.Application.Orders;

public static class OrderStatus
{
    public const int Pending = 0;
    public const int Confirmed = 1;
    public const int Preparing = 2;
    /// <summary>Gati për marrje nga driveri (restoranti e përfundon pjesën e vet).</summary>
    public const int ReadyForPickup = 5;
    public const int OutForDelivery = 3;
    public const int Delivered = 4;
    public const int Cancelled = 9;
}
