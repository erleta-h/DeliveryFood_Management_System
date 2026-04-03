namespace FoodDelivery.Domain.Entities;

public class MenuCategory
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Name { get; set; } = string.Empty;
    public long RestaurantId { get; set; }
    public int SortOrder { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<MenuItem> Items { get; set; } = new List<MenuItem>();
}
