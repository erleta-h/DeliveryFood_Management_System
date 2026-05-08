namespace FoodDelivery.Application.Drivers;

//Faza e dërgesës nga perspektiva e Deliver (fusha Delivery.Status).
public static class DeliveryDriverLeg
{
    public const int PendingAccept = 0;
    public const int HeadingToRestaurant = 1;
    public const int AtRestaurant = 2;
    public const int EnRouteToCustomer = 3;
    public const int Completed = 4;
}
