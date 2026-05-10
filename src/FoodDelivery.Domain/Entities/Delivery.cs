namespace FoodDelivery.Domain.Entities;

public class Delivery
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    //Kur Deliver-it iu ofrua porosia
    public DateTime? OfferedAtUtc { get; set; }
    // Kur pranoi ofert�n.
    public DateTime? AcceptedAtUtc { get; set; }
    public DateTime? ArrivedAtRestaurantUtc { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public long DriverUserId { get; set; }
    public long OrderId { get; set; }
    public DateTime? PickedUpAt { get; set; }
    // Faza e Deliver (pending accept, n� restorant, n� rrug�, etj.)
    public int Status { get; set; }
    //JSON i ID-ve t� driver-�ve q� mor�n ofert� dhe e refuzuan / skadoi (p�r radh� auto).
    public string? AutoDispatchExcludedDriverIdsJson { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public User Driver { get; set; } = null!;
    public Order Order { get; set; } = null!;
}
