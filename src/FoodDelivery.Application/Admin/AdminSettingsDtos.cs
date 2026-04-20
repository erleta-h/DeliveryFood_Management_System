namespace FoodDelivery.Application.Admin;

public sealed record AdminSettingItemDto(long Id, string Key, string? Value, string? Description, DateTime CreatedAt, DateTime? UpdatedAt);

public sealed record AdminSettingUpsertRequest(string Key, string? Value, string? Description);
