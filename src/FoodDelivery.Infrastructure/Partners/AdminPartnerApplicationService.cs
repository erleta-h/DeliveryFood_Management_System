using System.Security.Cryptography;
using System.Text;
using FoodDelivery.Application.Partners;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace FoodDelivery.Infrastructure.Partners;

public sealed class AdminPartnerApplicationService : IAdminPartnerApplicationService
{
    private readonly FoodDeliveryDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IHostEnvironment _env;

    public AdminPartnerApplicationService(
        FoodDeliveryDbContext db,
        IPasswordHasher<User> passwordHasher,
        IHostEnvironment env)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _env = env;
    }

    public async Task<IReadOnlyList<PartnerApplicationListItemDto>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        return await _db.RestaurantPartnerApplications
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new PartnerApplicationListItemDto(
                a.Id,
                a.CreatedAt,
                a.Status,
                a.VenueName,
                a.City,
                a.Email,
                a.ContactFirstName,
                a.ContactLastName,
                a.Phone,
                a.BusinessType,
                a.VenueCountLabel,
                a.StreetAddress,
                a.Message))
            .ToListAsync(cancellationToken);
    }

    public async Task<PartnerApplicationDetailDto?> GetDetailAsync(
        long applicationId,
        CancellationToken cancellationToken = default)
    {
        var app = await _db.RestaurantPartnerApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return null;

        var contract = await LoadContractDtoAsync(applicationId, cancellationToken);
        var history = await BuildHistoryAsync(applicationId, app.CreatedAt, cancellationToken);

        return new PartnerApplicationDetailDto(
            app.Id,
            app.CreatedAt,
            app.Status,
            app.VenueName,
            app.City,
            app.Email,
            app.ContactFirstName,
            app.ContactLastName,
            app.Phone,
            app.BusinessType,
            app.VenueCountLabel,
            app.StreetAddress,
            app.Message,
            app.Country,
            app.PostalCode,
            contract is not null,
            contract,
            history);
    }

    public async Task<string?> MarkContactedAsync(
        long applicationId,
        long actorUserId,
        CancellationToken cancellationToken = default)
    {
        var app = await _db.RestaurantPartnerApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return "Aplikimi nuk u gjet.";
        if (app.Status != PartnerApplicationStatuses.Pending)
            return "Vetëm aplikimet në pritje mund të shënohen si kontaktuar.";

        var now = DateTime.UtcNow;
        app.Status = PartnerApplicationStatuses.Contacted;
        PartnerApplicationAuditWriter.Add(
            _db,
            app.Id,
            PartnerApplicationAuditEventTypes.MarkedAsContacted,
            null,
            actorUserId,
            now);
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<(PartnerContractDocumentDto? Contract, string? Error)> UploadContractAsync(
        long applicationId,
        string fileName,
        Stream content,
        long sizeBytes,
        long actorUserId,
        CancellationToken cancellationToken = default)
    {
        var validation = PartnerApplicationContractFileHelper.ValidatePdf(fileName, sizeBytes);
        if (validation is not null)
            return (null, validation);

        var app = await _db.RestaurantPartnerApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return (null, "Aplikimi nuk u gjet.");
        if (app.Status is PartnerApplicationStatuses.Approved or PartnerApplicationStatuses.Rejected)
            return (null, "Nuk mund të ngarkohet kontrata për aplikime të përfunduara.");

        var entityId = PartnerApplicationContractFileHelper.EntityId(applicationId);
        var existing = await _db.StoredFiles
            .FirstOrDefaultAsync(
                f => f.Entity == PartnerApplicationContractFileHelper.EntityName && f.EntityId == entityId,
                cancellationToken);

        var now = DateTime.UtcNow;
        var root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, PartnerApplicationContractFileHelper.RelativeRoot));
        Directory.CreateDirectory(root);
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName))
            safeName = "kontrata.pdf";
        var diskName = $"{applicationId}_{Guid.NewGuid():N}{Path.GetExtension(safeName)}";
        var physicalPath = Path.Combine(root, diskName);

        await using (var fs = File.Create(physicalPath))
        {
            await content.CopyToAsync(fs, cancellationToken);
        }

        var isReplace = existing is not null;
        if (existing is not null)
        {
            PartnerApplicationContractFileHelper.TryDeletePhysical(existing.FilePath);
            existing.Filename = safeName;
            existing.FilePath = physicalPath;
            existing.FileSize = sizeBytes;
            existing.UpdatedAt = now;
            existing.UpdatedById = actorUserId;
            existing.UploaderId = actorUserId;
        }
        else
        {
            _db.StoredFiles.Add(new StoredFile
            {
                CreatedAt = now,
                CreatedById = actorUserId,
                Entity = PartnerApplicationContractFileHelper.EntityName,
                EntityId = entityId,
                FilePath = physicalPath,
                FileSize = sizeBytes,
                Filename = safeName,
                UploaderId = actorUserId,
            });
        }

        PartnerApplicationAuditWriter.Add(
            _db,
            applicationId,
            isReplace
                ? PartnerApplicationAuditEventTypes.ContractReplaced
                : PartnerApplicationAuditEventTypes.ContractUploaded,
            safeName,
            actorUserId,
            now);

        await _db.SaveChangesAsync(cancellationToken);
        var dto = await LoadContractDtoAsync(applicationId, cancellationToken);
        return (dto, null);
    }

    public async Task<(string? PhysicalPath, string? ContentType, string? Error)> GetContractFileAsync(
        long applicationId,
        CancellationToken cancellationToken = default)
    {
        var entityId = PartnerApplicationContractFileHelper.EntityId(applicationId);
        var file = await _db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(
                f => f.Entity == PartnerApplicationContractFileHelper.EntityName && f.EntityId == entityId,
                cancellationToken);
        if (file is null || string.IsNullOrWhiteSpace(file.FilePath))
            return (null, null, "Kontrata nuk u gjet.");
        if (!File.Exists(file.FilePath))
            return (null, null, "Skedari mungon në disk.");
        return (file.FilePath, "application/pdf", null);
    }

    public async Task<(ApprovePartnerApplicationResultDto? Result, string? Error)> ApproveAsync(
        long applicationId,
        ApprovePartnerApplicationRequest request,
        long approvedByUserId,
        CancellationToken cancellationToken = default)
    {
        var app = await _db.RestaurantPartnerApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return (null, "Aplikimi nuk u gjet.");

        if (app.Status is PartnerApplicationStatuses.Approved or PartnerApplicationStatuses.Rejected)
            return (null, "Ky aplikim është përfunduar — nuk mund të miratohet përsëri.");

        if (!await HasContractAsync(applicationId, cancellationToken))
            return (null, "Ngarko kontratën e partnerit para miratimit.");

        var email = app.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
            return (null, "Ky email është tashmë i përdorur. Përdor një tjetër ose lidh manualisht llogarinë.");

        var categoryId = await _db.FoodCategories
            .OrderBy(c => c.SortOrder)
            .Select(c => (long?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (categoryId is null)
            return (null, "Nuk ka kategori ushqimi në bazë. Shto së paku një kategori.");

        var staffRole = await _db.Roles.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == DbSeeder.RestaurantStaffRoleName, cancellationToken);
        if (staffRole is null)
            return (null, $"Roli {DbSeeder.RestaurantStaffRoleName} mungon në bazë.");

        var baseSlug = ToSlug(app.VenueName);
        var slug = await EnsureUniqueSlugAsync(baseSlug, cancellationToken);

        var password = string.IsNullOrWhiteSpace(request.InitialPassword)
            ? GenerateTempPassword()
            : request.InitialPassword.Trim();
        if (password.Length < 6)
            return (null, "Fjalëkalimi duhet të ketë të paktën 6 karaktere.");

        var now = DateTime.UtcNow;

        long? zoneId = await _db.DeliveryZones.AsNoTracking()
            .Where(z => z.IsActive && z.City == app.City.Trim())
            .OrderBy(z => z.SortOrder)
            .Select(z => (long?)z.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var restaurant = new Restaurant
        {
            Name = app.VenueName.Trim(),
            Slug = slug,
            AddressLine = app.StreetAddress.Trim(),
            City = app.City.Trim(),
            FoodCategoryId = categoryId.Value,
            DeliveryZoneId = zoneId,
            DeliveryFee = 1.50m,
            AverageRating = 0,
            ReviewCount = 0,
            MinOrderAmount = 3m,
            EstimatedDeliveryMinutes = 35,
            IsApproved = true,
            IsActive = true,
            CreatedAt = now,
            CreatedById = approvedByUserId,
            Description = $"Partner: {app.BusinessType}.",
            Phone = app.Phone,
        };
        _db.Restaurants.Add(restaurant);
        await _db.SaveChangesAsync(cancellationToken);

        var user = new User
        {
            Email = email,
            FirstName = app.ContactFirstName.Trim(),
            LastName = app.ContactLastName.Trim(),
            Phone = app.Phone,
            IsActive = true,
            CreatedAt = now,
            CreatedById = approvedByUserId,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        _db.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = staffRole.Id,
            AssignedAt = now,
            CreatedAt = now,
        });
        _db.RestaurantStaff.Add(new RestaurantStaff
        {
            UserId = user.Id,
            RestaurantId = restaurant.Id,
            Title = "Administrator restoranti",
            CreatedAt = now,
            CreatedById = approvedByUserId,
        });

        app.Status = PartnerApplicationStatuses.Approved;
        PartnerApplicationAuditWriter.Add(
            _db,
            app.Id,
            PartnerApplicationAuditEventTypes.ApplicationApproved,
            $"Restoranti {restaurant.Name} u krijua.",
            approvedByUserId,
            now);
        await _db.SaveChangesAsync(cancellationToken);

        await DbSeeder.AddMenuForSingleRestaurantAsync(_db, restaurant.Id, now, cancellationToken);

        return (new ApprovePartnerApplicationResultDto(
            email,
            password,
            restaurant.Id,
            restaurant.Name,
            slug), null);
    }

    public async Task<string?> RejectAsync(
        long applicationId,
        long rejectedByUserId,
        CancellationToken cancellationToken = default)
    {
        var app = await _db.RestaurantPartnerApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return "Aplikimi nuk u gjet.";
        if (app.Status == PartnerApplicationStatuses.Approved)
            return "Aplikimi është miratuar — nuk mund të refuzohet.";
        if (app.Status == PartnerApplicationStatuses.Rejected)
            return "Aplikimi është tashmë refuzuar.";

        var now = DateTime.UtcNow;
        app.Status = PartnerApplicationStatuses.Rejected;
        PartnerApplicationAuditWriter.Add(
            _db,
            app.Id,
            PartnerApplicationAuditEventTypes.ApplicationRejected,
            null,
            rejectedByUserId,
            now);
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<(ResetPartnerStaffPasswordResultDto? Result, string? Error)> ResetStaffPasswordAsync(
        long applicationId,
        ResetPartnerStaffPasswordRequest request,
        long adminUserId,
        CancellationToken cancellationToken = default)
    {
        var app = await _db.RestaurantPartnerApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return (null, "Aplikimi nuk u gjet.");

        if (app.Status != PartnerApplicationStatuses.Approved)
            return (null, "«Rivendos fjalëkalimin» lejohet vetëm për aplikime tashmë të miratuara.");

        var staffRole = await _db.Roles.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == DbSeeder.RestaurantStaffRoleName, cancellationToken);
        if (staffRole is null)
            return (null, $"Roli {DbSeeder.RestaurantStaffRoleName} mungon në bazë.");

        var emailNorm = app.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .Include(u => u.RestaurantStaffMemberships)
            .FirstOrDefaultAsync(
                u => u.Email.ToLower() == emailNorm,
                cancellationToken);

        if (user is null)
            return (null, "Nuk u gjet përdorues me email-in e aplikimit.");

        if (!user.IsActive)
            return (null, "Llogaria e partnerit është e çaktivizuar.");

        if (!user.UserRoles.Any(ur => ur.RoleId == staffRole.Id))
            return (null, "Ky përdorues nuk ka rol RestaurantStaff.");

        if (!user.RestaurantStaffMemberships.Any())
            return (null, "Mungon lidhja me restorantin (RestaurantStaff).");

        var password = string.IsNullOrWhiteSpace(request.NewPassword)
            ? GenerateTempPassword()
            : request.NewPassword.Trim();
        if (password.Length < 6)
            return (null, "Fjalëkalimi duhet të ketë të paktën 6 karaktere.");

        var now = DateTime.UtcNow;
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
        user.UpdatedAt = now;
        user.UpdatedById = adminUserId;

        var refresh = await _db.RefreshTokens
            .Where(t => t.UserId == user.Id)
            .ToListAsync(cancellationToken);
        _db.RefreshTokens.RemoveRange(refresh);

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "admin.partner.reset_staff_password",
            Entity = "User",
            EntityId = user.Id.ToString(),
            OldValue = app.VenueName,
            NewValue = "password-reset",
            UserId = adminUserId,
            CreatedAt = now,
        });

        PartnerApplicationAuditWriter.Add(
            _db,
            applicationId,
            PartnerApplicationAuditEventTypes.StaffPasswordReset,
            user.Email,
            adminUserId,
            now);

        await _db.SaveChangesAsync(cancellationToken);
        return (new ResetPartnerStaffPasswordResultDto(user.Email, password), null);
    }

    private async Task<bool> HasContractAsync(long applicationId, CancellationToken cancellationToken)
    {
        var entityId = PartnerApplicationContractFileHelper.EntityId(applicationId);
        return await _db.StoredFiles.AsNoTracking().AnyAsync(
            f => f.Entity == PartnerApplicationContractFileHelper.EntityName && f.EntityId == entityId,
            cancellationToken);
    }

    private async Task<PartnerContractDocumentDto?> LoadContractDtoAsync(
        long applicationId,
        CancellationToken cancellationToken)
    {
        var entityId = PartnerApplicationContractFileHelper.EntityId(applicationId);
        var file = await _db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(
                f => f.Entity == PartnerApplicationContractFileHelper.EntityName && f.EntityId == entityId,
                cancellationToken);
        if (file is null)
            return null;

        string? uploaderName = null;
        if (file.UploaderId > 0)
        {
            uploaderName = await _db.Users.AsNoTracking()
                .Where(u => u.Id == file.UploaderId)
                .Select(u => u.FirstName + " " + u.LastName)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var uploadedAt = file.UpdatedAt ?? file.CreatedAt;
        return new PartnerContractDocumentDto(
            file.Filename,
            file.FileSize,
            uploadedAt,
            uploaderName,
            $"/api/admin/partner-applications/{applicationId}/contract");
    }

    private async Task<IReadOnlyList<PartnerApplicationAuditEntryDto>> BuildHistoryAsync(
        long applicationId,
        DateTime createdAt,
        CancellationToken cancellationToken)
    {
        List<PartnerApplicationAudit> audits;
        try
        {
            audits = await _db.PartnerApplicationAudits.AsNoTracking()
                .Where(a => a.PartnerApplicationId == applicationId)
                .OrderBy(a => a.CreatedAtUtc)
                .ToListAsync(cancellationToken);
        }
        catch
        {
            audits = [];
        }

        if (audits.Count == 0)
        {
            return
            [
                new PartnerApplicationAuditEntryDto(
                    PartnerApplicationAuditEventTypes.ApplicationSubmitted,
                    null,
                    createdAt,
                    null),
            ];
        }

        var actorIds = audits
            .Where(a => a.CreatedByUserId is not null)
            .Select(a => a.CreatedByUserId!.Value)
            .Distinct()
            .ToList();
        var actors = actorIds.Count == 0
            ? new Dictionary<long, string>()
            : await _db.Users.AsNoTracking()
                .Where(u => actorIds.Contains(u.Id))
                .Select(u => new { u.Id, Name = u.FirstName + " " + u.LastName })
                .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        return audits.Select(a =>
        {
            string? actor = a.CreatedByUserId is long id && actors.TryGetValue(id, out var n) ? n : null;
            return new PartnerApplicationAuditEntryDto(a.EventType, a.Detail, a.CreatedAtUtc, actor);
        }).ToList();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var n = 0;
        while (await _db.Restaurants.AnyAsync(r => r.Slug == slug, cancellationToken))
        {
            n++;
            slug = $"{baseSlug}-{n}";
            if (n > 200)
                throw new InvalidOperationException("Nuk u gjet slug unik.");
        }

        return slug;
    }

    private static string ToSlug(string venueName)
    {
        var lower = venueName.Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        foreach (var c in lower)
        {
            if (char.IsLetterOrDigit(c))
                sb.Append(c);
            else if (c is ' ' or '-' or '_')
                sb.Append('-');
        }

        var s = sb.ToString().Trim('-');
        while (s.Contains("--", StringComparison.Ordinal))
            s = s.Replace("--", "-", StringComparison.Ordinal);
        if (s.Length == 0)
            s = $"partner-{Guid.NewGuid():N}"[..10];
        return s.Length <= 400 ? s : s[..400].TrimEnd('-');
    }

    private static string GenerateTempPassword()
    {
        Span<byte> buf = stackalloc byte[8];
        RandomNumberGenerator.Fill(buf);
        var part = Convert.ToHexString(buf)[..10];
        return $"Fd{part}a!";
    }
}
