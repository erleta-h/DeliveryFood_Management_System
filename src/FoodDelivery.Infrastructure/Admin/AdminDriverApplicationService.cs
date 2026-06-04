using System.Security.Cryptography;
using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Drivers;
using FoodDelivery.Infrastructure.Partners;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDriverApplicationService : IAdminDriverApplicationService
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IDriverActivationEmailSender _email;
    private readonly DriverActivationOptions _activationOpt;
    private readonly IHostEnvironment _env;

    public AdminDriverApplicationService(
        IUnitOfWork uow,
        IPasswordHasher<User> passwordHasher,
        IDriverActivationEmailSender email,
        IOptions<DriverActivationOptions> activationOpt,
        IHostEnvironment env)
    {
        _uow = uow;
        _passwordHasher = passwordHasher;
        _email = email;
        _activationOpt = activationOpt.Value;
        _env = env;
    }

    public async Task<DriverApplicationStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var q = _uow.Repository<DriverApplication, long>().Query.AsNoTracking();
        return new DriverApplicationStatsDto(
            await q.CountAsync(cancellationToken),
            await q.CountAsync(a => a.Status == DriverApplicationStatuses.Pending, cancellationToken),
            await q.CountAsync(a => a.Status == DriverApplicationStatuses.ApprovedWaitingActivation, cancellationToken),
            await q.CountAsync(a => a.Status == DriverApplicationStatuses.Active, cancellationToken),
            await q.CountAsync(a => a.Status == DriverApplicationStatuses.Rejected, cancellationToken));
    }

    public async Task<IReadOnlyList<DriverApplicationListItemDto>> ListAsync(
        DriverApplicationListQuery? query,
        CancellationToken cancellationToken = default)
    {
        var q = _uow.Repository<DriverApplication, long>().Query.AsNoTracking();
        q = ApplyListFilters(q, query);
        return await q
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new DriverApplicationListItemDto(
                a.Id,
                a.CreatedAt,
                a.Status,
                a.FirstName,
                a.LastName,
                a.Email,
                a.Phone,
                a.VehicleType,
                a.LicensePlate))
            .ToListAsync(cancellationToken);
    }

    public async Task<DriverApplicationDetailDto?> GetDetailAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        var app = await _uow.Repository<DriverApplication, long>().Query
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (app is null)
            return null;

        var audits = await _uow.Repository<DriverApplicationAudit, long>().Query
            .AsNoTracking()
            .Where(x => x.DriverApplicationId == id)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
        app.Audits = audits;

        string? approvedByName = null;
        if (app.UpdatedById is not null && app.ApprovedAtUtc is not null)
        {
            approvedByName = await _uow.Repository<User, long>().Query.AsNoTracking()
                .Where(u => u.Id == app.UpdatedById)
                .Select(u => u.FirstName + " " + u.LastName)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var docs = await LoadDocumentDtosAsync(app.Id, cancellationToken);
        var history = await BuildHistoryAsync(app, approvedByName, cancellationToken);
        var devUrl = _env.IsDevelopment()
            ? ReadDevActivationUrlFromDisk(app.Email)
            : null;

        return new DriverApplicationDetailDto(
            app.Id,
            app.CreatedAt,
            app.Status,
            app.FirstName,
            app.LastName,
            app.Email,
            app.Phone,
            app.Message,
            app.VehicleType,
            app.LicensePlate,
            app.RejectionReason,
            app.ApprovedAtUtc,
            approvedByName,
            app.ActivatedAtUtc,
            app.ActivationEmailSentAtUtc,
            app.Status == DriverApplicationStatuses.ApprovedWaitingActivation,
            devUrl,
            docs,
            history);
    }

    private string? ReadDevActivationUrlFromDisk(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var dir = Path.Combine(_env.ContentRootPath, "App_Data", "activation-emails");
        if (!Directory.Exists(dir))
            return null;

        var needle = email.Trim().Replace('@', '_');
        string? latestFile = null;
        DateTime latestTime = DateTime.MinValue;
        foreach (var path in Directory.EnumerateFiles(dir, "*.txt"))
        {
            var name = Path.GetFileName(path);
            if (!name.Contains(needle, StringComparison.OrdinalIgnoreCase))
                continue;

            var wt = File.GetLastWriteTimeUtc(path);
            if (wt <= latestTime)
                continue;

            latestTime = wt;
            latestFile = path;
        }

        if (latestFile is null)
            return null;

        try
        {
            var text = File.ReadAllText(latestFile);
            const string marker = "http";
            var idx = text.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (idx < 0)
                return null;

            var end = text.IndexOfAny(['\r', '\n', ' '], idx);
            return end < 0 ? text[idx..].Trim() : text[idx..end].Trim();
        }
        catch
        {
            return null;
        }
    }

    public async Task<(string? PhysicalPath, string? ContentType, string? Error)> GetDocumentFileAsync(
        long applicationId,
        string kind,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseDocumentKind(kind, out var docKind))
            return (null, null, "Lloji i dokumentit nuk njihet.");

        var entityId = DriverApplicationFileHelper.EntityId(applicationId, docKind);
        var file = await _uow.Repository<StoredFile, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(
                f => f.Entity == "DriverApplication" && f.EntityId == entityId,
                cancellationToken);
        if (file is null || string.IsNullOrWhiteSpace(file.FilePath))
            return (null, null, "Dokumenti nuk u gjet.");
        if (!File.Exists(file.FilePath))
            return (null, null, "Skedari mungon në disk.");

        return (file.FilePath, DriverApplicationFileHelper.GuessContentType(file.Filename), null);
    }

    public async Task<(ApproveDriverApplicationResultDto? Result, string? Error)> ApproveAsync(
        long applicationId,
        long approvedByUserId,
        bool includeDevActivationUrl,
        CancellationToken cancellationToken = default)
    {
        var app = await _uow.Repository<DriverApplication, long>().Query
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return (null, "Aplikimi nuk u gjet.");

        if (app.Status != DriverApplicationStatuses.Pending)
            return (null, "Vetëm aplikimet në pritje mund të miratohen.");

        var email = app.Email.Trim().ToLowerInvariant();
        if (await _uow.Repository<User, long>().Query.AnyAsync(u => u.Email.ToLower() == email, cancellationToken))
            return (null, "Ky email është tashmë i përdorur.");

        var driverRole = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == DbSeeder.DriverRoleName, cancellationToken);
        if (driverRole is null)
            return (null, $"Roli {DbSeeder.DriverRoleName} mungon në bazë.");

        var now = DateTime.UtcNow;
        var placeholderPw = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        var user = new User
        {
            Email = app.Email.Trim(),
            FirstName = app.FirstName.Trim(),
            LastName = app.LastName.Trim(),
            Phone = app.Phone,
            IsActive = false,
            MustChangePassword = false,
            EmailConfirmed = false,
            CreatedAt = now,
            CreatedById = approvedByUserId,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, placeholderPw);
        _uow.Repository<User, long>().Add(user);
        await _uow.SaveChangesAsync(cancellationToken);

        _uow.Repository<UserRole, long>().Add(new UserRole
        {
            UserId = user.Id,
            RoleId = driverRole.Id,
            AssignedAt = now,
            CreatedAt = now,
        });

        _uow.Repository<DriverProfile, long>().Add(new DriverProfile
        {
            UserId = user.Id,
            VehicleType = app.VehicleType.Trim(),
            LicensePlate = string.IsNullOrWhiteSpace(app.LicensePlate) ? null : app.LicensePlate.Trim(),
            IsOnline = false,
            CreatedAt = now,
            CreatedById = approvedByUserId,
        });

        app.Status = DriverApplicationStatuses.ApprovedWaitingActivation;
        app.UserId = user.Id;
        app.ApprovedAtUtc = now;
        app.UpdatedAt = now;
        app.UpdatedById = approvedByUserId;
        app.RejectionReason = null;

        DriverApplicationAuditWriter.Add(
            _uow,
            app.Id,
            DriverApplicationAuditEventTypes.ApplicationApproved,
            $"Llogaria u krijua për {user.Email}.",
            approvedByUserId,
            now);

        var activationUrl = await IssueActivationTokenAndEmailAsync(
            user,
            app,
            approvedByUserId,
            DriverApplicationAuditEventTypes.ActivationEmailSent,
            cancellationToken);

        await _uow.SaveChangesAsync(cancellationToken);

        return (new ApproveDriverApplicationResultDto(
            user.Email,
            true,
            app.ActivationEmailSentAtUtc,
            includeDevActivationUrl && _env.IsDevelopment() ? activationUrl : null), null);
    }

    public async Task<string?> RejectAsync(
        long applicationId,
        RejectDriverApplicationRequest request,
        long rejectedByUserId,
        CancellationToken cancellationToken = default)
    {
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason))
            return "Jep arsyen e refuzimit.";
        if (reason.Length > 500)
            return "Arsyeja është shumë e gjatë.";

        var app = await _uow.Repository<DriverApplication, long>().Query
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return "Aplikimi nuk u gjet.";
        if (app.Status != DriverApplicationStatuses.Pending)
            return "Vetëm aplikimet në pritje mund të refuzohen.";

        var now = DateTime.UtcNow;
        app.Status = DriverApplicationStatuses.Rejected;
        app.RejectionReason = reason;
        app.UpdatedAt = now;
        app.UpdatedById = rejectedByUserId;

        DriverApplicationAuditWriter.Add(
            _uow,
            app.Id,
            DriverApplicationAuditEventTypes.ApplicationRejected,
            reason,
            rejectedByUserId,
            now);

        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<(ResendDriverActivationResultDto? Result, string? Error)> ResendActivationEmailAsync(
        long applicationId,
        long actorUserId,
        bool includeDevActivationUrl,
        CancellationToken cancellationToken = default)
    {
        var app = await _uow.Repository<DriverApplication, long>().Query
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return (null, "Aplikimi nuk u gjet.");
        if (app.Status != DriverApplicationStatuses.ApprovedWaitingActivation || app.User is null)
            return (null, "Email aktivizimi mund të ridërgohet vetëm për aplikime të miratuara që presin aktivizim.");

        var activationUrl = await IssueActivationTokenAndEmailAsync(
            app.User,
            app,
            actorUserId,
            DriverApplicationAuditEventTypes.ActivationEmailResent,
            cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return (new ResendDriverActivationResultDto(
            true,
            app.ActivationEmailSentAtUtc,
            includeDevActivationUrl && _env.IsDevelopment() ? activationUrl : null), null);
    }

    private async Task<string> IssueActivationTokenAndEmailAsync(
        User user,
        DriverApplication app,
        long actorUserId,
        string auditEventType,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var existing = await _uow.Repository<AccountActivationToken, long>().Query
            .Where(t => t.UserId == user.Id && t.UsedAtUtc == null)
            .ToListAsync(cancellationToken);
        foreach (var t in existing)
            t.UsedAtUtc = now;

        var plain = ActivationTokenHelper.GeneratePlainToken();
        _uow.Repository<AccountActivationToken, long>().Add(new AccountActivationToken
        {
            UserId = user.Id,
            TokenHash = ActivationTokenHelper.HashToken(plain),
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(Math.Clamp(_activationOpt.TokenLifetimeHours, 1, 168)),
        });

        var baseUrl = _activationOpt.WebAppBaseUrl.TrimEnd('/');
        var activationUrl = $"{baseUrl}/activate-account?token={Uri.EscapeDataString(plain)}";
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        await _email.SendActivationEmailAsync(user.Email, fullName, activationUrl, cancellationToken);

        app.ActivationEmailSentAtUtc = now;
        DriverApplicationAuditWriter.Add(_uow, app.Id, auditEventType, user.Email, actorUserId, now);
        return activationUrl;
    }

    private static IQueryable<DriverApplication> ApplyListFilters(
        IQueryable<DriverApplication> q,
        DriverApplicationListQuery? query)
    {
        if (query is null)
            return q;

        if (query.Status is byte status)
            q = q.Where(a => a.Status == status);

        if (query.FromUtc is { } from)
            q = q.Where(a => a.CreatedAt >= from);

        if (query.ToUtc is { } to)
            q = q.Where(a => a.CreatedAt <= to);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            q = q.Where(a =>
                a.FirstName.ToLower().Contains(term)
                || a.LastName.ToLower().Contains(term)
                || a.Email.ToLower().Contains(term)
                || a.Phone.Contains(term));
        }

        return q;
    }

    private async Task<IReadOnlyList<DriverApplicationDocumentDto>> LoadDocumentDtosAsync(
        long applicationId,
        CancellationToken cancellationToken)
    {
        var prefix = $"{applicationId}:";
        var files = await _uow.Repository<StoredFile, long>().Query.AsNoTracking()
            .Where(f => f.Entity == "DriverApplication" && f.EntityId.StartsWith(prefix))
            .ToListAsync(cancellationToken);

        return files.Select(f =>
        {
            var kind = f.EntityId.Contains(':') ? f.EntityId.Split(':')[^1] : "file";
            return new DriverApplicationDocumentDto(
                kind,
                f.Filename,
                f.FileSize,
                $"/api/admin/driver-applications/{applicationId}/documents/{kind}");
        }).ToList();
    }

    private async Task<IReadOnlyList<DriverApplicationAuditEntryDto>> BuildHistoryAsync(
        DriverApplication app,
        string? approvedByName,
        CancellationToken cancellationToken)
    {
        var audits = app.Audits
            .OrderBy(a => a.CreatedAtUtc)
            .ToList();

        if (audits.Count == 0)
        {
            audits =
            [
                new DriverApplicationAudit
                {
                    EventType = DriverApplicationAuditEventTypes.ApplicationSubmitted,
                    CreatedAtUtc = app.CreatedAt,
                    Detail = null,
                },
            ];
        }

        var actorIds = audits.Where(a => a.CreatedByUserId is not null).Select(a => a.CreatedByUserId!.Value).Distinct().ToList();
        var actors = actorIds.Count == 0
            ? new Dictionary<long, string>()
            : await _uow.Repository<User, long>().Query.AsNoTracking()
                .Where(u => actorIds.Contains(u.Id))
                .Select(u => new { u.Id, Name = u.FirstName + " " + u.LastName })
                .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        return audits.Select(a =>
        {
            string? actor = a.CreatedByUserId is long id && actors.TryGetValue(id, out var n) ? n : null;
            if (a.EventType == DriverApplicationAuditEventTypes.ApplicationApproved && approvedByName is not null)
                actor = approvedByName;
            return new DriverApplicationAuditEntryDto(
                a.EventType,
                a.Detail,
                a.CreatedAtUtc,
                actor);
        }).ToList();
    }

    private static bool TryParseDocumentKind(string kind, out DriverApplicationDocumentKind docKind)
    {
        switch (kind.ToLowerInvariant())
        {
            case "identity":
                docKind = DriverApplicationDocumentKind.Identity;
                return true;
            case "license":
                docKind = DriverApplicationDocumentKind.License;
                return true;
            case "vehiclephoto":
                docKind = DriverApplicationDocumentKind.VehiclePhoto;
                return true;
            default:
                docKind = default;
                return false;
        }
    }
}
