namespace FoodDelivery.Domain.Entities;

public class Setting
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string? Description { get; set; }
    public string Key { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public string? Value { get; set; }
}
