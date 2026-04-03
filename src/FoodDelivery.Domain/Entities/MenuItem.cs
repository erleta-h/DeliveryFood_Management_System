namespace FoodDelivery.Domain.Entities;

public class MenuItem
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Description { get; set; }
    public bool IsAvailable { get; set; }
    public long MenuCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }

    public MenuCategory MenuCategory { get; set; } = null!;
}
