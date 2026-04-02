namespace FoodDelivery.Domain.Entities;

public class Role
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string? Description { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
