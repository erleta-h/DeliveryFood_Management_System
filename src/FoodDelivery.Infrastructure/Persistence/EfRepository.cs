using FoodDelivery.Application.Persistence;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Persistence;

public sealed class EfRepository<TEntity, TKey> : IRepository<TEntity, TKey>
    where TEntity : class
{
    private readonly FoodDeliveryDbContext _db;

    public EfRepository(FoodDeliveryDbContext db) => _db = db;

    public IQueryable<TEntity> Query => _db.Set<TEntity>();

    public Task<TEntity?> GetByIdAsync(TKey id, CancellationToken cancellationToken = default) =>
        _db.Set<TEntity>().FindAsync(new object?[] { id! }, cancellationToken).AsTask();

    public void Add(TEntity entity) => _db.Set<TEntity>().Add(entity);

    public void AddRange(IEnumerable<TEntity> entities) => _db.Set<TEntity>().AddRange(entities);

    public void Remove(TEntity entity) => _db.Set<TEntity>().Remove(entity);

    public void RemoveRange(IEnumerable<TEntity> entities) => _db.Set<TEntity>().RemoveRange(entities);
}
