using FoodDelivery.Application.Auth;
//using FoodDelivery.Application.Maps;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Auth;

public sealed class AuthService : IAuthService
{
    public const string CustomerRoleName = "Customer";

    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenIssuer _jwt;
    private readonly IRefreshTokenService _refreshTokens;

    public AuthService(
        IUnitOfWork uow,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenIssuer jwt,
        IRefreshTokenService refreshTokens)
    {
        _uow = uow;
        _passwordHasher = passwordHasher;
        _jwt = jwt;
        _refreshTokens = refreshTokens;
    }

    public async Task<AuthResult> RegisterCustomerAsync(RegisterCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            return AuthResult.Fail("Plotëso emailin dhe fjalëkalimin.", AuthErrorCode.Validation);
        if (request.Password.Length < 6)
            return AuthResult.Fail("Fjalëkalimi duhet të ketë të paktën 6 karaktere.", AuthErrorCode.Validation);
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
            return AuthResult.Fail("Plotëso emrin dhe mbiemrin.", AuthErrorCode.Validation);
        if (string.IsNullOrWhiteSpace(request.Line1) || string.IsNullOrWhiteSpace(request.City))
            return AuthResult.Fail("Plotëso adresën dhe qytetin.", AuthErrorCode.Validation);
        if (!PhoneValidation.TryNormalize(request.Phone, out var phoneNorm, out var phoneErr))
            return AuthResult.Fail(phoneErr ?? "Telefon i pavlefshëm.", AuthErrorCode.Validation);

        if (await _uow.Repository<User, long>().Query.AnyAsync(u => u.Email == email, cancellationToken))
            return AuthResult.Fail("Ky email është tashmë i regjistruar.", AuthErrorCode.DuplicateEmail);

        var role = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == CustomerRoleName, cancellationToken);
        if (role is null)
            return AuthResult.Fail("Roli i klientit nuk është konfiguruar në bazë. Rinis API-n pas migrimit.", AuthErrorCode.RoleMissing);

        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = email,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Phone = phoneNorm,
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _uow.Repository<User, long>().Add(user);
        await _uow.SaveChangesAsync(cancellationToken);

        _uow.Repository<UserRole, long>().Add(new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            AssignedAt = now,
            CreatedAt = now,
        });

        var customerAddr = new CustomerAddress
        {
            UserId = user.Id,
            Label = "Kryesore",
            Line1 = request.Line1.Trim(),
            City = request.City.Trim(),
            PostalCode = string.IsNullOrWhiteSpace(request.PostalCode) ? null : request.PostalCode.Trim(),
            IsDefault = true,
            CreatedAt = now,
        };
        _uow.Repository<CustomerAddress, long>().Add(customerAddr);

        await _uow.SaveChangesAsync(cancellationToken);

        var dto = await LoadAuthUserDtoAsync(user.Id, cancellationToken);
        if (dto is null)
            return AuthResult.Fail("Regjistrimi dështoi pas krijimit të llogarisë.", AuthErrorCode.Validation);

        return await IssueSessionAsync(user.Id, user.Email, new[] { CustomerRoleName }, Array.Empty<string>(), dto, cancellationToken);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            return AuthResult.Fail("Plotëso emailin dhe fjalëkalimin.", AuthErrorCode.Validation);

        var user = await _uow.Repository<User, long>().Query
            .Include(u => u.Addresses)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null)
            return AuthResult.Fail("Email ose fjalëkalim i gabuar.", AuthErrorCode.InvalidCredentials);

        if (!user.IsActive)
            return AuthResult.Fail("Llogaria është joaktive.", AuthErrorCode.InactiveUser);

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed)
            return AuthResult.Fail("Email ose fjalëkalim i gabuar.", AuthErrorCode.InvalidCredentials);

        var roleNames = user.UserRoles
            .Select(ur => ur.Role.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct()
            .OrderBy(x => x)
            .ToList();
        if (roleNames.Count == 0)
            roleNames.Add(CustomerRoleName);
        var permissions = await LoadPermissionNamesForUserAsync(user.Id, cancellationToken);
        var dto = MapUser(user);
        return await IssueSessionAsync(user.Id, user.Email, roleNames, permissions, dto, cancellationToken);
    }

    public async Task<AuthResult> RefreshAsync(string refreshTokenPlain, CancellationToken cancellationToken = default)
    {
        var rotated = await _refreshTokens.RotateAsync(refreshTokenPlain, cancellationToken);
        if (rotated is null)
            return AuthResult.Fail("Sesioni ka skaduar. Hyr përsëri.", AuthErrorCode.InvalidRefreshToken);

        var (newPlain, refreshExp, userId) = rotated.Value;

        var user = await _uow.Repository<User, long>().Query.AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || !user.IsActive)
            return AuthResult.Fail("Sesioni ka skaduar. Hyr përsëri.", AuthErrorCode.InvalidRefreshToken);

        var roleNames = user.UserRoles
            .Select(ur => ur.Role.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct()
            .OrderBy(x => x)
            .ToList();
        if (roleNames.Count == 0)
            roleNames.Add(CustomerRoleName);

        var permissions = await LoadPermissionNamesForUserAsync(user.Id, cancellationToken);
        var dto = await LoadAuthUserDtoAsync(user.Id, cancellationToken);
        if (dto is null)
            return AuthResult.Fail("Sesioni ka skaduar. Hyr përsëri.", AuthErrorCode.InvalidRefreshToken);

        var access = _jwt.CreateAccessToken(user.Id, user.Email, roleNames, permissions, out var accessExp);
        return AuthResult.Ok(new AuthResponseDto(access, accessExp, dto, refreshExp), newPlain);
    }

    public Task LogoutAsync(string? refreshTokenPlain, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(refreshTokenPlain))
            return _refreshTokens.RevokeAsync(refreshTokenPlain, cancellationToken);
        return Task.CompletedTask;
    }

    public async Task<AuthUserDto?> GetProfileAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await LoadAuthUserDtoAsync(userId, cancellationToken);
    }

    public async Task<(AuthUserDto? User, string? ValidationError)> UpdateProfileAsync(
        long userId,
        UpdateCustomerProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _uow.Repository<User, long>().Query
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null) return (null, null);

        if (request.Phone is not null)
        {
            if (!PhoneValidation.TryNormalize(request.Phone, out var p, out var pErr))
                return (null, pErr);
            user.Phone = p;
            user.UpdatedAt = DateTime.UtcNow;
        }

        var addr = user.Addresses.FirstOrDefault(a => a.IsDefault) ?? user.Addresses.FirstOrDefault();
        if (addr is null)
        {
            addr = new CustomerAddress
            {
                UserId = user.Id,
                Label = "Kryesore",
                Line1 = request.Line1?.Trim() ?? string.Empty,
                City = request.City?.Trim() ?? string.Empty,
                IsDefault = true,
                CreatedAt = DateTime.UtcNow,
            };
            if (!string.IsNullOrWhiteSpace(request.PostalCode))
                addr.PostalCode = request.PostalCode.Trim();
            _uow.Repository<CustomerAddress, long>().Add(addr);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.Line1))
                addr.Line1 = request.Line1.Trim();
            if (!string.IsNullOrWhiteSpace(request.City))
                addr.City = request.City.Trim();
            if (request.PostalCode != null)
                addr.PostalCode = string.IsNullOrWhiteSpace(request.PostalCode) ? null : request.PostalCode.Trim();
            addr.UpdatedAt = DateTime.UtcNow;
        }

        if (request.Latitude is not null && request.Longitude is not null)
        {
            addr.Latitude = request.Latitude;
            addr.Longitude = request.Longitude;
        }

        await _uow.SaveChangesAsync(cancellationToken);
        var dto = await LoadAuthUserDtoAsync(userId, cancellationToken);
        return (dto, null);
    }

    public async Task<string?> ChangePasswordAsync(
        long userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return "Plotëso fjalëkalimin aktual dhe të rinë.";

        var newPw = request.NewPassword.Trim();
        if (newPw.Length < 6)
            return "Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.";

        if (newPw == request.CurrentPassword)
            return "Fjalëkalimi i ri duhet të ndryshohet nga i vjetri.";

        var user = await _uow.Repository<User, long>().Query.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
            return "Përdoruesi nuk u gjet.";

        if (!user.IsActive)
            return "Llogaria është joaktive.";

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verify == PasswordVerificationResult.Failed)
            return "Fjalëkalimi aktual është i gabuar.";

        var now = DateTime.UtcNow;
        user.PasswordHash = _passwordHasher.HashPassword(user, newPw);
        user.MustChangePassword = false;
        user.UpdatedAt = now;
        user.UpdatedById = userId;

        var refresh = await _uow.Repository<RefreshToken, long>().Query
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ToListAsync(cancellationToken);
        var nowRevoke = DateTime.UtcNow;
        foreach (var t in refresh)
        {
            t.RevokedAt = nowRevoke;
            t.UpdatedAt = nowRevoke;
        }

        _uow.Repository<AuditLog, long>().Add(new AuditLog
        {
            Action = "user.change_password",
            Entity = "User",
            EntityId = user.Id.ToString(),
            UserId = userId,
            CreatedAt = now,
            CreatedById = userId,
            NewValue = "self",
        });

        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private async Task<AuthResult> IssueSessionAsync(
        long userId,
        string email,
        IReadOnlyList<string> roleNames,
        IReadOnlyList<string> permissions,
        AuthUserDto dto,
        CancellationToken cancellationToken)
    {
        var access = _jwt.CreateAccessToken(userId, email, roleNames, permissions, out var accessExp);
        var (plain, refreshExp) = await _refreshTokens.CreateAsync(userId, cancellationToken);
        return AuthResult.Ok(new AuthResponseDto(access, accessExp, dto, refreshExp), plain);
    }

    private async Task<IReadOnlyList<string>> LoadPermissionNamesForUserAsync(
        long userId,
        CancellationToken cancellationToken) =>
        await (from ur in _uow.Repository<UserRole, long>().Query.AsNoTracking()
               where ur.UserId == userId
               join rp in _uow.Repository<RolePermission, long>().Query.AsNoTracking() on ur.RoleId equals rp.RoleId
               join p in _uow.Repository<Permission, long>().Query.AsNoTracking() on rp.PermissionId equals p.Id
               select p.Name)
            .Distinct()
            .ToListAsync(cancellationToken);

    private async Task<AuthUserDto?> LoadAuthUserDtoAsync(long userId, CancellationToken cancellationToken)
    {
        var user = await _uow.Repository<User, long>().Query
            .AsNoTracking()
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user is null ? null : MapUser(user);
    }

    private static AuthUserDto MapUser(User u)
    {
        var addr = u.Addresses.FirstOrDefault(a => a.IsDefault) ?? u.Addresses.FirstOrDefault();
        return new AuthUserDto(
            u.Email,
            u.FirstName,
            u.LastName,
            u.Phone ?? string.Empty,
            addr?.Line1 ?? string.Empty,
            addr?.City ?? string.Empty,
            addr?.PostalCode,
            u.MustChangePassword);
    }
}
