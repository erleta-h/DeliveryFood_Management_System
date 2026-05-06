namespace FoodDelivery.Domain.Entities;

public class RolePermission
{
    public long Id { get; set; }
    public DateTime? CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public long PermissionId { get; set; }
    public long RoleId { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    public Permission Permission { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
