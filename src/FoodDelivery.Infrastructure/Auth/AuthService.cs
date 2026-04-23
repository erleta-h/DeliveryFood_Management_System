using FoodDelivery.Application.Auth;
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

    public AuthService(
        IUnitOfWork uow,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenIssuer jwt)
    {
        _uow = uow;
        _passwordHasher = passwordHasher;
        _jwt = jwt;
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
            CreatedAt = now,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        user.UserRoles.Add(new UserRole
        {
            RoleId = role.Id,
            AssignedAt = now,
            CreatedAt = now,
        });
        _uow.Repository<User, long>().Add(user);
        await _uow.SaveChangesAsync(cancellationToken);
        var token = _jwt.CreateAccessToken(
            user.Id,
            user.Email,
            new[] { CustomerRoleName },
            out var exp);
        var dto = new AuthUserDto(
            user.Email,
            user.FirstName,
            user.LastName,
            user.Phone ?? string.Empty,
            request.Line1.Trim(),
            request.City.Trim(),
            string.IsNullOrWhiteSpace(request.PostalCode) ? null : request.PostalCode.Trim());
        return AuthResult.Ok(new AuthResponseDto(token, exp, dto));
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            return AuthResult.Fail("Plotëso emailin dhe fjalëkalimin.", AuthErrorCode.Validation);
        var user = await _uow.Repository<User, long>().Query
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
        var token = _jwt.CreateAccessToken(user.Id, user.Email, roleNames, out var exp);
        var dto = MapUser(user);
        return AuthResult.Ok(new AuthResponseDto(token, exp, dto));
    }

    public async Task<AuthUserDto?> GetProfileAsync(long userId, CancellationToken cancellationToken = default)
    {
        var user = await _uow.Repository<User, long>().Query
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user is null ? null : MapUser(user);
    }

    public async Task<(AuthUserDto? User, string? ValidationError)> UpdateProfileAsync(
        long userId,
        UpdateCustomerProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _uow.Repository<User, long>().Query
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null) return (null, null);
        if (request.Phone is not null)
        {
            if (!PhoneValidation.TryNormalize(request.Phone, out var p, out var pErr))
                return (null, pErr);
            user.Phone = p;
            user.UpdatedAt = DateTime.UtcNow;
        }
        // Pa CustomerAddress: fushat Line1/City/PostalCode në DB nuk ruhen (shto entitetin më vonë).
        await _uow.SaveChangesAsync(cancellationToken);
        return (MapUser(user), null);
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
        user.UpdatedAt = now;
        user.UpdatedById = userId;
        var refresh = await _uow.Repository<RefreshToken, long>().Query
            .Where(t => t.UserId == user.Id)
            .ToListAsync(cancellationToken);
        _uow.Repository<RefreshToken, long>().RemoveRange(refresh);
        await _uow.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static AuthUserDto MapUser(User u) =>
        new(
            u.Email,
            u.FirstName,
            u.LastName,
            u.Phone ?? string.Empty,
            string.Empty,
            string.Empty,
            null);
}
