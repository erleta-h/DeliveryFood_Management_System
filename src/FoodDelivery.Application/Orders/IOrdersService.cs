namespace FoodDelivery.Application.Orders;

public interface IOrdersService
{
    /// <summary>Vendos porosinë; kopjon telefonin e klientit në <c>Order.ContactPhone</c>.</summary>
    Task<(PlaceOrderResponse? Response, string? Error)> PlaceOrderAsync(
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

    /// <summary>Heq porosinë nga lista e klientit (historia); nuk fshin të dhënat nga platforma.</summary>
    Task<bool> HideOrderFromCustomerHistoryAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Anulon porosinë në pritje kur pagesa me kartë nuk është kryer (refuzim / klienti largohet).
    /// Idempotent nëse porosia është tashmë e anuluar.
    /// </summary>
    Task<(bool Ok, string? Error)> CancelUnpaidStripeOrderAsync(
        long userId,
        long orderId,
        CancellationToken cancellationToken = default);

    Task<(SubmitOrderReviewResponse? Response, string? Error)> SubmitOrderReviewAsync(
        long userId,
        long orderId,
        SubmitOrderReviewRequest request,
        CancellationToken cancellationToken = default);
}
