using FoodDelivery.Application.Persistence;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Persistence;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly FoodDeliveryDbContext _db;

    public UnitOfWork(FoodDeliveryDbContext db) => _db = db;

    public IRepository<TEntity, TKey> Repository<TEntity, TKey>()
        where TEntity : class =>
        new EfRepository<TEntity, TKey>(_db);

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}
