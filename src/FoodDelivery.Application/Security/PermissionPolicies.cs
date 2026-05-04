namespace FoodDelivery.Application.Security;

public static class PermissionPolicies
{
    public static string For(string permissionName) => $"Perm:{permissionName}";
}
