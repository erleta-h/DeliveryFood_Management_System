namespace FoodDelivery.Domain.Entities;

public class Delivery
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    /// <summary>Kur Deliver-it iu ofrua porosia (prano/refuzo + countdown).</summary>
    public DateTime? OfferedAtUtc { get; set; }
    /// <summary>Kur pranoi ofertën.</summary>
    public DateTime? AcceptedAtUtc { get; set; }
    public DateTime? ArrivedAtRestaurantUtc { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public long DriverUserId { get; set; }
    public long OrderId { get; set; }
    public DateTime? PickedUpAt { get; set; }
    /// <summary>Faza e Deliver (pending accept, në restorant, në rrugë, etj.).</summary>
    public int Status { get; set; }
    /// <summary>JSON i ID-ve të driver-ëve që morën ofertë dhe e refuzuan / skadoi (për radhë auto).</summary>
    public string? AutoDispatchExcludedDriverIdsJson { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public User Driver { get; set; } = null!;
    public Order Order { get; set; } = null!;
}
