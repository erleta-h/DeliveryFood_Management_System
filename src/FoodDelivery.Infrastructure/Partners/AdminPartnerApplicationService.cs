using System.Security.Cryptography;
using System.Text;
using FoodDelivery.Application.Partners;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Partners;

public sealed class AdminPartnerApplicationService : IAdminPartnerApplicationService
{
    private readonly FoodDeliveryDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AdminPartnerApplicationService(
        FoodDeliveryDbContext db,
        IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
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
                a.ContactLastName))
            .ToListAsync(cancellationToken);
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
        var restaurant = new Restaurant
        {
            Name = app.VenueName.Trim(),
            Slug = slug,
            AddressLine = app.StreetAddress.Trim(),
            City = app.City.Trim(),
            FoodCategoryId = categoryId.Value,
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
        long _rejectedByUserId,
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

        app.Status = PartnerApplicationStatuses.Rejected;
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

        await _db.SaveChangesAsync(cancellationToken);
        return (new ResetPartnerStaffPasswordResultDto(user.Email, password), null);
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
