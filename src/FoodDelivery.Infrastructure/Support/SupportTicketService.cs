using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.Support;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Realtime;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Support;

public sealed class SupportTicketService : ISupportTicketService
{
    private readonly IUnitOfWork _uow;
    private readonly IHubContext<OrderTrackingHub> _hub;
    private readonly ILogger<SupportTicketService> _log;
    private readonly IWebHostEnvironment _env;
    private readonly SupportAttachmentStorageOptions _attachOpt;

    public SupportTicketService(
        IUnitOfWork uow,
        IHubContext<OrderTrackingHub> hub,
        ILogger<SupportTicketService> log,
        IWebHostEnvironment env,
        IOptions<SupportAttachmentStorageOptions> attachOpt)
    {
        _uow = uow;
        _hub = hub;
        _log = log;
        _env = env;
        _attachOpt = attachOpt.Value;
    }

    public async Task<(long? Id, string? Error)> CreateAsync(
        long userId,
        CreateSupportTicketRequest request,
        CancellationToken cancellationToken = default)
    {
        var subject = request.Subject.Trim();
        var body = request.Body.Trim();
        if (subject.Length is < 1 or > 200)
            return (null, "Titulli: 1–200 karaktere.");
        if (body.Length is < 1 or > 4000)
            return (null, "Mesazhi: 1–4000 karaktere.");
        if (!SupportTicketCategory.IsValid(request.Category))
            return (null, "Kategoria e pavlefshme.");

        var (orderId, restaurantId, driverId, orderErr) = await ResolveOrderLinkAsync(
            userId,
            request.OrderId,
            request.OrderNumber,
            request.RestaurantId,
            cancellationToken);
        if (orderErr is not null)
            return (null, orderErr);

        if (restaurantId is null)
        {
            var staffRestaurantId = await _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
                .Where(s => s.UserId == userId)
                .Select(s => (long?)s.RestaurantId)
                .FirstOrDefaultAsync(cancellationToken);
            if (staffRestaurantId is { } sr)
                restaurantId = sr;
        }

        if (orderId is null && restaurantId is { } restId)
        {
            var exists = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
                .AnyAsync(r => r.Id == restId, cancellationToken);
            if (!exists)
                return (null, "Restoranti nuk u gjet.");
        }

        var now = DateTime.UtcNow;
        var priority = request.Priority is { } p && SupportTicketPriority.IsValid(p)
            ? p
            : SupportTicketPriority.AutoFromCategory(request.Category);

        var t = new SupportTicket
        {
            UserId = userId,
            Subject = subject,
            Body = body,
            Status = SupportTicketStatus.Open,
            Category = request.Category,
            Priority = priority,
            CreatedAt = now,
            OrderId = orderId,
            RestaurantId = restaurantId,
            DriverId = driverId,
        };
        _uow.Repository<SupportTicket, long>().Add(t);
        await _uow.SaveChangesAsync(cancellationToken);

        var creator = await _uow.Repository<User, long>().Query.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Email, u.FirstName, u.LastName })
            .FirstOrDefaultAsync(cancellationToken);
        string? restaurantName = null;
        if (restaurantId is { } rid)
        {
            restaurantName = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
                .Where(r => r.Id == rid)
                .Select(r => r.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var creatorLabel = !string.IsNullOrWhiteSpace(restaurantName)
            ? restaurantName.Trim()
            : creator is null
                ? "Përdorues"
                : $"{creator.FirstName} {creator.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(creatorLabel) && creator is not null)
            creatorLabel = creator.Email;

        _uow.Repository<SupportTicketAudit, long>().Add(new SupportTicketAudit
        {
            SupportTicketId = t.Id,
            ActorUserId = userId,
            Action = $"Tiketa u krijua nga {creatorLabel}",
            CreatedAt = now,
        });
        await _uow.SaveChangesAsync(cancellationToken);

        await AdminSupportNotificationHelper.NotifyAdminsAsync(
            _uow,
            _hub,
            _log,
            t.Id,
            "Tiketë support e re",
            $"[{SupportTicketCategory.Labels.GetValueOrDefault(request.Category, "?")}] {subject}",
            NotificationTypes.SupportTicketNew,
            cancellationToken);

        return (t.Id, null);
    }

    private async Task<(long? OrderId, long? RestaurantId, long? DriverId, string? Error)> ResolveOrderLinkAsync(
        long userId,
        long? orderId,
        string? orderNumber,
        long? restaurantId,
        CancellationToken cancellationToken)
    {
        long? resolvedOrderId = orderId is > 0 ? orderId : null;
        if (resolvedOrderId is null)
        {
            var refText = orderNumber?.Trim();
            if (!string.IsNullOrEmpty(refText))
            {
                resolvedOrderId = await _uow.Repository<Order, long>().Query.AsNoTracking()
                    .Where(o => o.OrderNumber == refText)
                    .Select(o => (long?)o.Id)
                    .FirstOrDefaultAsync(cancellationToken);
            }
        }

        // ID / nr. porosie është opsional — nëse nuk lidhet, tiketa krijohet pa OrderId.
        if (resolvedOrderId is not { } oid)
            return (null, restaurantId, null, null);

        var orderRow = await _uow.Repository<Order, long>().Query.AsNoTracking()
            .Where(o => o.Id == oid)
            .Select(o => new { o.RestaurantId, o.UserId })
            .FirstOrDefaultAsync(cancellationToken);
        if (orderRow is null)
            return (null, restaurantId, null, null);

        var canLink = orderRow.UserId == userId
            || await _uow.Repository<Delivery, long>().Query.AsNoTracking()
                .AnyAsync(d => d.OrderId == oid && d.DriverUserId == userId, cancellationToken)
            || await (
                from s in _uow.Repository<RestaurantStaff, long>().Query.AsNoTracking()
                where s.UserId == userId && s.RestaurantId == orderRow.RestaurantId
                select s.Id).AnyAsync(cancellationToken);

        if (!canLink)
            return (null, restaurantId, null, null);

        restaurantId ??= orderRow.RestaurantId;

        var driverId = await _uow.Repository<Delivery, long>().Query.AsNoTracking()
            .Where(d => d.OrderId == oid)
            .Select(d => (long?)d.DriverUserId)
            .FirstOrDefaultAsync(cancellationToken);

        return (oid, restaurantId, driverId, null);
    }

    public async Task<IReadOnlyList<SupportTicketMineItemDto>> ListMineAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        return await (
            from x in _uow.Repository<SupportTicket, long>().Query.AsNoTracking()
            where x.UserId == userId
            join o in _uow.Repository<Order, long>().Query.AsNoTracking() on x.OrderId equals o.Id into og
            from o in og.DefaultIfEmpty()
            orderby x.CreatedAt descending
            select new SupportTicketMineItemDto(
                x.Id,
                x.Subject,
                x.Status,
                x.Category,
                x.Priority,
                x.CreatedAt,
                x.UpdatedAt,
                x.ResolvedAt,
                1 + x.Messages.Count,
                o != null ? o.OrderNumber : null))
            .ToListAsync(cancellationToken);
    }

    public async Task<SupportTicketThreadDto?> GetThreadAsync(
        long userId,
        long ticketId,
        CancellationToken cancellationToken = default)
    {
        var t = await _uow.Repository<SupportTicket, long>().Query
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Messages).ThenInclude(m => m.Author)
            .Include(x => x.Order)
            .Include(x => x.Restaurant)
            .Include(x => x.Driver)
            .Include(x => x.AssignedTo)
            .FirstOrDefaultAsync(x => x.Id == ticketId && x.UserId == userId, cancellationToken);
        var attachments = await LoadAttachmentsAsync(ticketId, cancellationToken);
        return MapThread(t, attachments);
    }

    public async Task<(long? MessageId, string? Error)> PostCustomerMessageAsync(
        long userId,
        long ticketId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var trimmed = body.Trim();
        if (trimmed.Length is < 1 or > 4000)
            return (null, "Mesazhi: 1–4000 karaktere.");

        var t = await _uow.Repository<SupportTicket, long>().Query
            .FirstOrDefaultAsync(x => x.Id == ticketId && x.UserId == userId, cancellationToken);
        if (t is null)
            return (null, "Tiketa nuk u gjet.");
        if (t.Status == SupportTicketStatus.Closed)
            return (null, "Tiketa është e mbyllur.");

        var now = DateTime.UtcNow;
        var msg = new SupportTicketMessage
        {
            SupportTicketId = ticketId,
            AuthorUserId = userId,
            Body = trimmed,
            IsStaffReply = false,
            CreatedAt = now,
        };
        _uow.Repository<SupportTicketMessage, long>().Add(msg);
        t.UpdatedAt = now;
        await _uow.SaveChangesAsync(cancellationToken);

        var preview = trimmed.Length > 80 ? trimmed[..80] + "…" : trimmed;
        await AdminSupportNotificationHelper.NotifyAdminsAsync(
            _uow,
            _hub,
            _log,
            ticketId,
            "Përgjigje nga klienti",
            $"{t.Subject}: {preview}",
            NotificationTypes.SupportClientReply,
            cancellationToken);

        return (msg.Id, null);
    }

    public async Task<(long? AttachmentId, string? Error)> AddAttachmentAsync(
        long userId,
        long ticketId,
        long? messageId,
        Stream fileStream,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        var extErr = SupportTicketFileHelper.ValidateExtension(originalFileName);
        if (extErr is not null)
            return (null, extErr);

        var t = await _uow.Repository<SupportTicket, long>().Query
            .FirstOrDefaultAsync(x => x.Id == ticketId && x.UserId == userId, cancellationToken);
        if (t is null)
            return (null, "Tiketa nuk u gjet.");
        if (t.Status == SupportTicketStatus.Closed)
            return (null, "Tiketa është e mbyllur.");

        if (messageId is { } mid)
        {
            var msgOk = await _uow.Repository<SupportTicketMessage, long>().Query.AsNoTracking()
                .AnyAsync(m => m.Id == mid && m.SupportTicketId == ticketId, cancellationToken);
            if (!msgOk)
                return (null, "Mesazhi nuk u gjet.");
        }

        var count = await _uow.Repository<SupportTicketAttachment, long>().Query.AsNoTracking()
            .CountAsync(a => a.SupportTicketId == ticketId, cancellationToken);
        if (count >= _attachOpt.MaxAttachmentsPerTicket)
            return (null, $"Maksimum {_attachOpt.MaxAttachmentsPerTicket} foto për tiketë.");

        var root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, _attachOpt.RelativeRoot));
        Directory.CreateDirectory(root);
        var ext = Path.GetExtension(originalFileName);
        var safeName = $"{ticketId}_{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(root, safeName);

        long totalWritten = 0;
        try
        {
            await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                var buffer = new byte[81920];
                int read;
                while ((read = await fileStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
                {
                    totalWritten += read;
                    if (totalWritten > _attachOpt.MaxFileBytes)
                    {
                        SupportTicketFileHelper.TryDeletePhysical(fullPath);
                        return (null, $"Fotoja duhet të jetë maksimum {_attachOpt.MaxFileBytes / 1024 / 1024} MB.");
                    }

                    await fs.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                }
            }
        }
        catch
        {
            SupportTicketFileHelper.TryDeletePhysical(fullPath);
            return (null, "Ngarkimi i fotos dështoi.");
        }

        if (totalWritten == 0)
        {
            SupportTicketFileHelper.TryDeletePhysical(fullPath);
            return (null, "Skedari i fotos është bosh.");
        }

        var displayName = string.IsNullOrWhiteSpace(originalFileName) ? safeName : originalFileName.Trim();
        if (displayName.Length > 500)
            displayName = displayName[..500];

        var now = DateTime.UtcNow;
        var stored = new StoredFile
        {
            Entity = "SupportTicket",
            EntityId = ticketId.ToString(),
            Filename = displayName,
            FilePath = fullPath,
            FileSize = totalWritten,
            UploaderId = userId,
            CreatedAt = now,
        };
        _uow.Repository<StoredFile, long>().Add(stored);
        await _uow.SaveChangesAsync(cancellationToken);

        var row = new SupportTicketAttachment
        {
            SupportTicketId = ticketId,
            MessageId = messageId,
            StoredFileId = stored.Id,
            UploadedByUserId = userId,
            CreatedAt = now,
        };
        _uow.Repository<SupportTicketAttachment, long>().Add(row);
        t.UpdatedAt = now;
        await _uow.SaveChangesAsync(cancellationToken);

        return (row.Id, null);
    }

    public async Task<(string? PhysicalPath, string? ContentType, string? Error)> GetAttachmentFileAsync(
        long userId,
        long ticketId,
        long attachmentId,
        bool allowPlatformStaff,
        CancellationToken cancellationToken = default)
    {
        var att = await _uow.Repository<SupportTicketAttachment, long>().Query.AsNoTracking()
            .Include(a => a.StoredFile)
            .Include(a => a.SupportTicket)
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.SupportTicketId == ticketId, cancellationToken);
        if (att is null)
            return (null, null, "Bashkëngjitja nuk u gjet.");

        if (att.SupportTicket.UserId == userId)
        {
            /* owner */
        }
        else if (allowPlatformStaff)
        {
            var isStaff = await (
                from ur in _uow.Repository<UserRole, long>().Query.AsNoTracking()
                join r in _uow.Repository<Role, long>().Query.AsNoTracking() on ur.RoleId equals r.Id
                where ur.UserId == userId && (r.Name == "Admin" || r.Name == "Support")
                select ur.UserId)
                .AnyAsync(cancellationToken);
            if (!isStaff)
                return (null, null, "Nuk ke akses.");
        }
        else
        {
            return (null, null, "Nuk ke akses.");
        }

        var path = att.StoredFile.FilePath;
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            return (null, null, "Skedari mungon në disk.");

        return (path, SupportTicketFileHelper.GuessContentType(att.StoredFile.Filename), null);
    }

    internal static async Task<List<SupportTicketAttachment>> LoadAttachmentsAsync(
        IUnitOfWork uow,
        long ticketId,
        CancellationToken cancellationToken)
    {
        return await uow.Repository<SupportTicketAttachment, long>().Query.AsNoTracking()
            .Include(a => a.StoredFile)
            .Where(a => a.SupportTicketId == ticketId)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<SupportTicketAttachment>> LoadAttachmentsAsync(
        long ticketId,
        CancellationToken cancellationToken) =>
        await LoadAttachmentsAsync(_uow, ticketId, cancellationToken);

    internal static SupportTicketThreadDto MapThread(
        SupportTicket t,
        IReadOnlyList<SupportTicketAttachment> attachments)
    {
        var initialAttachments = attachments
            .Where(a => a.MessageId is null)
            .Select(ToAttachmentDto)
            .ToList();

        var byMessage = attachments
            .Where(a => a.MessageId is not null)
            .GroupBy(a => a.MessageId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(ToAttachmentDto).ToList());

        var messages = t.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportTicketMessageDto(
                m.Id,
                m.AuthorUserId,
                m.Author.Email,
                m.IsStaffReply,
                m.Body,
                m.CreatedAt,
                byMessage.TryGetValue(m.Id, out var ma) ? ma : Array.Empty<SupportTicketAttachmentDto>()))
            .ToList();

        return new SupportTicketThreadDto(
            t.Id, t.UserId, t.User.Email, t.Subject, t.Body,
            t.Status, t.Category, t.Priority,
            t.CreatedAt, t.UpdatedAt, t.ResolvedAt, t.AdminNote,
            t.OrderId, t.Order?.OrderNumber,
            t.RestaurantId, t.Restaurant?.Name,
            t.DriverId, t.Driver != null ? $"{t.Driver.FirstName} {t.Driver.LastName}".Trim() : null,
            t.AssignedToUserId, t.AssignedTo?.Email,
            initialAttachments,
            messages);
    }

    private static SupportTicketAttachmentDto ToAttachmentDto(SupportTicketAttachment a) =>
        new(a.Id, a.MessageId, a.StoredFile.Filename, a.CreatedAt);
}
