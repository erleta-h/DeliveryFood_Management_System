namespace FoodDelivery.Domain.Entities;

public class Order
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long CustomerAddressId { get; set; }
    /// <summary>Kopje e numrit të telefonit në momentin e porosisë (kontakt për restorantin).</summary>
    public string? ContactPhone { get; set; }
    public string? CustomerNotes { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal DiscountTotal { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime PlacedAt { get; set; }
    public long RestaurantId { get; set; }
    /// <summary>0 = dërgesë, 1 = marrje në restoran.</summary>
    public int FulfillmentType { get; set; }
    public int Status { get; set; }
    public decimal Subtotal { get; set; }
    /// <summary>Komisioni i platformës mbi nëntotalin (snapshot në momentin e porosisë).</summary>
    public decimal PlatformFeeAmount { get; set; }
    /// <summary>Përqindja e zbatuar (0–100), snapshot.</summary>
    public decimal PlatformFeePercentApplied { get; set; }
    public decimal Total { get; set; }
    /// <summary>Minuta të vlerësuara për përgatitje (snapshot në porosi; kuzhina mund t’i ndryshojë).</summary>
    public int EstimatedPrepMinutes { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public long UserId { get; set; }

    /// <summary>Nëse është vendosur, porosia nuk shfaqet më te «Porositë e mia» (klienti e ka hequr nga historia).</summary>
    public DateTime? CustomerHiddenAt { get; set; }

    public CustomerAddress CustomerAddress { get; set; } = null!;
    public Restaurant Restaurant { get; set; } = null!;
    public User User { get; set; } = null!;
    public Delivery? Delivery { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<OrderCoupon> OrderCoupons { get; set; } = new List<OrderCoupon>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
    public ICollection<OrderDeliveryChatMessage> DeliveryChatMessages { get; set; } = new List<OrderDeliveryChatMessage>();
}
