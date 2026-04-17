using FoodDelivery.Application.Admin;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminSettingsService : IAdminSettingsService
{
    private readonly FoodDeliveryDbContext _db;

    public AdminSettingsService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AdminSettingItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Settings.AsNoTracking()
            .OrderBy(s => s.Key)
            .Select(s => new AdminSettingItemDto(
                s.Id,
                s.Key,
                s.Value,
                s.Description,
                s.CreatedAt,
                s.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<string?> UpsertAsync(AdminSettingUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var key = request.Key.Trim();
        if (key.Length is < 1 or > 128)
            return "Çelësi 1–128 karaktere.";

        var existing = await _db.Settings.FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
        var now = DateTime.UtcNow;
        if (existing is null)
        {
            _db.Settings.Add(new Setting
            {
                Key = key,
                Value = request.Value,
                Description = request.Description,
                CreatedAt = now,
            });
        }
        else
        {
            existing.Value = request.Value;
            if (request.Description is not null)
                existing.Description = request.Description;
            existing.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
