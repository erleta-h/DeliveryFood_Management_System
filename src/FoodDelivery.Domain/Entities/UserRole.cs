namespace FoodDelivery.Domain.Entities;

public class UserRole
{
    public long Id { get; set; }
    public DateTime AssignedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long RoleId { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public long UserId { get; set; }

    public Role Role { get; set; } = null!;
    public User User { get; set; } = null!;
}
