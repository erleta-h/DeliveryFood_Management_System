using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Restaurants;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Restaurants;

public sealed class PublicMenuImageService : IPublicMenuImageService
{
    private readonly IUnitOfWork _uow;

    public PublicMenuImageService(IUnitOfWork uow) => _uow = uow;

    public async Task<(string PhysicalPath, string Filename)?> GetMenuImageAsync(
        long fileId,
        CancellationToken cancellationToken = default)
    {
        var usedByMenu = await _uow.Repository<MenuItem, long>().Query.AsNoTracking()
            .AnyAsync(m => m.ImageFileId == fileId, cancellationToken);
        var usedByRestaurantBranding = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
            .AnyAsync(
                r => r.IsActive && r.IsApproved && (r.LogoFileId == fileId || r.CoverFileId == fileId),
                cancellationToken);
        if (!usedByMenu && !usedByRestaurantBranding)
            return null;

        var file = await _uow.Repository<StoredFile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);
        if (file is null || string.IsNullOrWhiteSpace(file.FilePath))
            return null;

        if (!File.Exists(file.FilePath))
            return null;

        return (file.FilePath, file.Filename);
    }
}
