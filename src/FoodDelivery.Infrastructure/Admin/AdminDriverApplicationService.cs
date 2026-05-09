using System.Security.Cryptography;
using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Partners;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDriverApplicationService : IAdminDriverApplicationService
{
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AdminDriverApplicationService(IUnitOfWork uow, IPasswordHasher<User> passwordHasher)
    {
        _uow = uow;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<DriverApplicationListItemDto>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        return await _uow.Repository<DriverApplication, long>().Query
            .AsNoTracking()
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

    public async Task<(ApproveDriverApplicationResultDto? Result, string? Error)> ApproveAsync(
        long applicationId,
        ApproveDriverApplicationRequest request,
        long approvedByUserId,
        CancellationToken cancellationToken = default)
    {
        var app = await _uow.Repository<DriverApplication, long>().Query
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return (null, "Aplikimi nuk u gjet.");

        if (app.Status is PartnerApplicationStatuses.Approved or PartnerApplicationStatuses.Rejected)
            return (null, "Ky aplikim është përfunduar.");

        var email = app.Email.Trim().ToLowerInvariant();
        if (await _uow.Repository<User, long>().Query.AnyAsync(u => u.Email.ToLower() == email, cancellationToken))
            return (null, "Ky email është tashmë i përdorur.");

        var driverRole = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == DbSeeder.DriverRoleName, cancellationToken);
        if (driverRole is null)
            return (null, $"Roli {DbSeeder.DriverRoleName} mungon në bazë.");

        var password = string.IsNullOrWhiteSpace(request.InitialPassword)
            ? GenerateTempPassword()
            : request.InitialPassword.Trim();
        if (password.Length < 6)
            return (null, "Fjalëkalimi duhet të ketë të paktën 6 karaktere.");

        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = app.Email.Trim(),
            FirstName = app.FirstName.Trim(),
            LastName = app.LastName.Trim(),
            Phone = app.Phone,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = now,
            CreatedById = approvedByUserId,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);
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

        app.Status = PartnerApplicationStatuses.Approved;
        app.UpdatedAt = now;
        app.UpdatedById = approvedByUserId;
        await _uow.SaveChangesAsync(cancellationToken);

        return (new ApproveDriverApplicationResultDto(user.Email, password), null);
    }

    public async Task<string?> RejectAsync(
        long applicationId,
        long rejectedByUserId,
        CancellationToken cancellationToken = default)
    {
        var app = await _uow.Repository<DriverApplication, long>().Query
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);
        if (app is null)
            return "Aplikimi nuk u gjet.";
        if (app.Status == PartnerApplicationStatuses.Approved)
            return "Aplikimi është miratuar.";
        if (app.Status == PartnerApplicationStatuses.Rejected)
            return "Aplikimi është tashmë refuzuar.";

        var now = DateTime.UtcNow;
        app.Status = PartnerApplicationStatuses.Rejected;
        app.UpdatedAt = now;
        app.UpdatedById = rejectedByUserId;
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static string GenerateTempPassword()
    {
        Span<byte> buf = stackalloc byte[8];
        RandomNumberGenerator.Fill(buf);
        var part = Convert.ToHexString(buf)[..10];
        return $"Fd{part}a!";
    }
}
