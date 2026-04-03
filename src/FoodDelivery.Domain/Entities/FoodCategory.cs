namespace FoodDelivery.Domain.Entities;

public class FoodCategory
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Description { get; set; }
    public string? IconKey { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();
}
