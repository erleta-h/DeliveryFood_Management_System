namespace FoodDelivery.Domain.Entities;

public class Restaurant
{
    public long Id { get; set; }
    public string? AddressLine { get; set; }
    public decimal AverageRating { get; set; }
    public string? City { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public decimal DeliveryFee { get; set; }
    public string? Description { get; set; }
    public int EstimatedDeliveryMinutes { get; set; }
    public long FoodCategoryId { get; set; }
    public bool IsActive { get; set; }
    public bool IsApproved { get; set; }
    public bool IsFeatured { get; set; }
    public decimal MinOrderAmount { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? DeliveryZoneId { get; set; }
    public decimal? OverrideDeliveryFee { get; set; }
    public decimal? OverrideMinOrderAmount { get; set; }
    public int? OverrideEstimatedDeliveryMinutes { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Phone { get; set; }
    public int ReviewCount { get; set; }
    public string? Slug { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public FoodCategory FoodCategory { get; set; } = null!;
    public DeliveryZone? DeliveryZone { get; set; }
    public ICollection<FavoriteRestaurant> FavoritedBy { get; set; } = new List<FavoriteRestaurant>();
    public ICollection<MenuCategory> MenuCategories { get; set; } = new List<MenuCategory>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<RestaurantStaff> Staff { get; set; } = new List<RestaurantStaff>();
}
