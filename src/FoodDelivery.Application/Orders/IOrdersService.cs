namespace FoodDelivery.Application.Orders;

public interface IOrdersService
{
    /// <summary>Vendos porosinë; kopjon telefonin e klientit në <c>Order.ContactPhone</c>.</summary>
    Task<(long? OrderId, string? Error)> PlaceOrderAsync(
        long userId,
        PlaceOrderRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CustomerOrderSummaryDto>> GetMyOrdersAsync(
        long userId,
        CancellationToken cancellationToken = default);

    Task<CustomerOrderDetailDto?> GetMyOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default);
}
