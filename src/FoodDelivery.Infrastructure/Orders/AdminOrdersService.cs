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

    public async Task<AdminOrderDetailDto?> GetDetailAsync(
        long orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await _db.Orders.AsNoTracking()
            .Include(o => o.Restaurant)
            .Include(o => o.User)
            .Include(o => o.CustomerAddress)
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Include(o => o.StatusHistory)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order is null)
            return null;

        var items = order.Items
            .OrderBy(i => i.Id)
            .Select(i => new AdminOrderItemDto(
                i.NameSnapshot,
                i.Quantity,
                i.UnitPrice,
                i.UnitPrice * i.Quantity))
            .ToList();

        var payments = order.Payments
            .OrderBy(p => p.Id)
            .Select(p => new AdminOrderPaymentDto(
                p.Id,
                p.Amount,
                p.Currency,
                p.Provider,
                p.Status))
            .ToList();

        var history = order.StatusHistory
            .OrderBy(h => h.CreatedAt)
            .Select(h => new AdminOrderStatusHistoryDto(
                h.Id,
                h.Status,
                h.Note,
                h.CreatedAt))
            .ToList();

        return new AdminOrderDetailDto(
            order.Id,
            order.OrderNumber,
            order.PlacedAt,
            order.Status,
            order.FulfillmentType,
            order.Subtotal,
            order.DeliveryFee,
            order.DiscountTotal,
            order.Total,
            order.RestaurantId,
            order.Restaurant.Name,
            order.UserId,
            order.User.Email,
            order.ContactPhone ?? order.User.Phone,
            order.CustomerNotes,
            order.CustomerAddress.Line1,
            order.CustomerAddress.Line2,
            order.CustomerAddress.City,
            order.CustomerAddress.PostalCode,
            items,
            payments,
            history);
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