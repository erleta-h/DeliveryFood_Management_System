namespace FoodDelivery.Application.Orders;

public static class PaymentStatus
{
    public const int Pending = 0;
    public const int Captured = 1;
    public const int Refunded = 2;
    public const int Failed = 3;
}
