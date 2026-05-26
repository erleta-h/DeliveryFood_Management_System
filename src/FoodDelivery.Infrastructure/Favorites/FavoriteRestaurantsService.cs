using FoodDelivery.Application.Favorites;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Favorites;

public sealed class FavoriteRestaurantsService : IFavoriteRestaurantsService
{
    private readonly IUnitOfWork _uow;

    public FavoriteRestaurantsService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<long>> GetRestaurantIdsAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<FavoriteRestaurant, long>().Query
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.RestaurantId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<bool> IsFavoriteAsync(
        long userId,
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<FavoriteRestaurant, long>().Query
            .AsNoTracking()
            .AnyAsync(f => f.UserId == userId && f.RestaurantId == restaurantId, cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<FavoriteRestaurantToggleResult> ToggleAsync(
        long userId,
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        var restaurantExists = await _uow.Repository<Restaurant, long>().Query
            .AsNoTracking()
            .AnyAsync(r => r.Id == restaurantId && r.IsActive && r.IsApproved, cancellationToken)
            .ConfigureAwait(false);
        if (!restaurantExists)
            throw new InvalidOperationException("Restoranti nuk u gjet.");

        var repo = _uow.Repository<FavoriteRestaurant, long>();
        var existing = await repo.Query
            .FirstOrDefaultAsync(f => f.UserId == userId && f.RestaurantId == restaurantId, cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            repo.Remove(existing);
            await _uow.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return new FavoriteRestaurantToggleResult(false);
        }

        repo.Add(new FavoriteRestaurant
        {
            UserId = userId,
            RestaurantId = restaurantId,
            CreatedAt = DateTime.UtcNow,
            CreatedById = userId,
        });
        await _uow.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new FavoriteRestaurantToggleResult(true);
    }
}
