namespace FoodDelivery.Application.Abstractions;

public interface ICurrentUserAccessor
{
    long? UserId { get; }
}
