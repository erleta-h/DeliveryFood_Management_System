namespace FoodDelivery.Application.Orders;

//Auto-ofertë te driver-i më i afërt brenda radiusit, me radhë dhe skadencë.
public interface IDeliveryAutoDispatchService
{
    /// <summary>
    /// Nis ofertën e parë kur porosia kalon në «gati për marrje» (dërgesë).
    /// Nëse nuk ka driver të përshtatshëm, nuk bën asgjë — kitchen mund të caktojë manualisht.
    /// </summary>
    Task StartAutoDispatchForOrderAsync(long orderId, long? createdByUserId, CancellationToken cancellationToken = default);

    // Skan krejt ofertat PendingAccept që kanë skaduar dhe kalon te driver-i tjetër.
    Task ProcessExpiredPendingOffersAsync(CancellationToken cancellationToken = default);

    // Pas refuzimit të ofertës nga driver-i aktual.
    Task OnDriverDeclinedOfferAsync(long orderId, long driverUserId, CancellationToken cancellationToken = default);
}
