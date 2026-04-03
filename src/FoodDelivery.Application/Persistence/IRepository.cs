namespace FoodDelivery.Application.Persistence;

/// <summary>
/// Shtresa e repository-t: izolon aksesin në entitetet EF (kërkesë e kursit: Controllers → Services → Repositories).
/// </summary>
public interface IRepository<TEntity, TKey>
    where TEntity : class
{
    IQueryable<TEntity> Query { get; }

    Task<TEntity?> GetByIdAsync(TKey id, CancellationToken cancellationToken = default);

    void Add(TEntity entity);

    void AddRange(IEnumerable<TEntity> entities);

    void Remove(TEntity entity);

    void RemoveRange(IEnumerable<TEntity> entities);
}
