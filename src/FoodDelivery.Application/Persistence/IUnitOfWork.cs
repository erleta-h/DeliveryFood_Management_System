namespace FoodDelivery.Application.Persistence;

/// <summary>
/// Njësi pune për një kërkesë HTTP: të gjitha repository-t përdorin të njëjtin DbContext scoped.
/// </summary>
public interface IUnitOfWork
{
    IRepository<TEntity, TKey> Repository<TEntity, TKey>()
        where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
