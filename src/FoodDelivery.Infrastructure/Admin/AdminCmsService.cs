using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminCmsService : IAdminCmsService
{
    private const string Prefix = "cms.";

    private readonly IUnitOfWork _uow;

    public AdminCmsService(IUnitOfWork uow) => _uow = uow;

    public async Task<IReadOnlyList<AdminCmsEntryDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<Setting, long>().Query.AsNoTracking()
            .Where(s => s.Key.StartsWith(Prefix))
            .OrderBy(s => s.Key)
            .Select(s => new AdminCmsEntryDto(s.Key, s.Value, s.Description))
            .ToListAsync(cancellationToken);
    }

    public async Task<string?> UpsertAsync(
        string key,
        string? value,
        string? description,
        CancellationToken cancellationToken = default)
    {
        var k = key.Trim();
        if (!k.StartsWith(Prefix, StringComparison.Ordinal))
            return "Vetëm çelësat që fillojnë me «cms.» (përmbajtje statike, jo biznes).";

        if (k.Length is < 4 or > 128)
            return "Çelësi 4–128 karaktere.";

        var existing = await _uow.Repository<Setting, long>().Query.FirstOrDefaultAsync(s => s.Key == k, cancellationToken);
        var now = DateTime.UtcNow;
        if (existing is null)
        {
            _uow.Repository<Setting, long>().Add(new Setting
            {
                Key = k,
                Value = value,
                Description = description,
                CreatedAt = now,
            });
        }
        else
        {
            existing.Value = value;
            if (description is not null)
                existing.Description = description;
            existing.UpdatedAt = now;
        }

        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }
}
