using FoodDelivery.Application.Orders;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Orders;

public sealed class AdminOrdersService : IAdminOrdersService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminOrdersService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminOrderListResultDto> ListAsync(
        AdminOrderListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var q = _db.Orders.AsNoTracking();

        if (query.FromUtc is { } from)
            q = q.Where(o => o.PlacedAt >= from);
        if (query.ToUtc is { } to)
            q = q.Where(o => o.PlacedAt <= to);
        if (query.Status is { } st)
            q = q.Where(o => o.Status == st);
        if (query.RestaurantId is { } rid)
            q = q.Where(o => o.RestaurantId == rid);
        if (query.CustomerUserId is { } uid)
            q = q.Where(o => o.UserId == uid);

        var total = await q.CountAsync(cancellationToken);

        var ids = await q
            .OrderByDescending(o => o.PlacedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => o.Id)
            .ToListAsync(cancellationToken);

        if (ids.Count == 0)
            return new AdminOrderListResultDto(Array.Empty<AdminOrderListItemDto>(), total, page, pageSize);

        var orders = await _db.Orders.AsNoTracking()
            .Where(o => ids.Contains(o.Id))
            .Include(o => o.Restaurant)
            .Include(o => o.User)
            .Include(o => o.Payments)
            .ToListAsync(cancellationToken);

        var byId = orders.ToDictionary(o => o.Id);
        var items = ids
            .Select(id => MapListItem(byId[id]))
            .ToList();

        return new AdminOrderListResultDto(items, total, page, pageSize);
    }

    private static AdminOrderListItemDto MapListItem(Order o)
    {
        var payments = o.Payments
            .Select(p => new AdminOrderPaymentDto(
                p.Id,
                p.Amount,
                p.Currency,
                p.Provider,
                p.Status))
            .ToList();

        return new AdminOrderListItemDto(
            o.Id,
            o.OrderNumber,
            o.PlacedAt,
            o.Status,
            o.Total,
            o.RestaurantId,
            o.Restaurant.Name,
            o.UserId,
            o.User.Email,
            payments);
    }

    public async Task<string?> UpdateStatusAsync(
        long adminUserId,
        long orderId,
        int newStatus,
        CancellationToken cancellationToken = default)
    {
        if (!IsKnownOrderStatus(newStatus))
            return "Status i panjohur.";

        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet.";

        if (order.Status == OrderStatus.Cancelled)
            return "Porosia e anuluar nuk ndryshohet.";

        if (order.Status == newStatus)
            return "Porosia është tashmë në këtë status.";

        var now = DateTime.UtcNow;
        order.Status = newStatus;
        order.UpdatedAt = now;
        order.UpdatedById = adminUserId;

        _db.OrderStatusHistory.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = newStatus,
            Note = "admin:set-status",
            CreatedAt = now,
            CreatedById = adminUserId,
        });

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> CancelAsync(long adminUserId, long orderId, CancellationToken cancellationToken = default)
    {
        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet.";

        if (order.Status == OrderStatus.Cancelled)
            return null;

        if (order.Status == OrderStatus.Delivered)
            return "Porosia e dorëzuar nuk anulohet nga paneli (përdor rimbursim / support).";

        var now = DateTime.UtcNow;
        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = now;
        order.UpdatedById = adminUserId;

        _db.OrderStatusHistory.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = OrderStatus.Cancelled,
            Note = "admin:cancel",
            CreatedAt = now,
            CreatedById = adminUserId,
        });

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> RefundAsync(long adminUserId, long orderId, CancellationToken cancellationToken = default)
    {
        var order = await _db.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null)
            return "Porosia nuk u gjet.";

        if (order.Status == OrderStatus.Delivered)
            return "Porosia e dorëzuar nuk rimbursohet nga ky modul (kontrollo manualisht).";

        var toRefund = order.Payments
            .Where(p => p.Status is PaymentStatus.Pending or PaymentStatus.Captured)
            .ToList();

        if (toRefund.Count == 0)
            return "Nuk ka pagesë në gjendje për rimbursim (ose është rimbursuar).";

        var now = DateTime.UtcNow;
        foreach (var p in toRefund)
        {
            p.Status = PaymentStatus.Refunded;
            p.UpdatedAt = now;
            p.UpdatedById = adminUserId;
        }

        if (order.Status != OrderStatus.Cancelled)
        {
            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = now;
            order.UpdatedById = adminUserId;
            _db.OrderStatusHistory.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                Status = OrderStatus.Cancelled,
                Note = "admin:refund",
                CreatedAt = now,
                CreatedById = adminUserId,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static bool IsKnownOrderStatus(int s) =>
        s is OrderStatus.Pending
            or OrderStatus.Confirmed
            or OrderStatus.Preparing
            or OrderStatus.ReadyForPickup
            or OrderStatus.OutForDelivery
            or OrderStatus.Delivered
            or OrderStatus.Cancelled;
}
