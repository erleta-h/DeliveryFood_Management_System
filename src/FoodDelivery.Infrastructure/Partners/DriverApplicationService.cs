using FoodDelivery.Application.Drivers;
using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Partners;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Partners;

public sealed class DriverApplicationService : IDriverApplicationService
{
    private static readonly string[] AdminNotifyRoles = ["Admin", "Support"];

    private readonly IUnitOfWork _uow;
    private readonly INotificationPublisher _notifications;

    public DriverApplicationService(IUnitOfWork uow, INotificationPublisher notifications)
    {
        _uow = uow;
        _notifications = notifications;
    }

    public async Task<string?> SubmitAsync(
        SubmitDriverApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PhoneValidation.TryNormalize(request.Phone, out var phoneNorm, out var phoneErr))
            return phoneErr;

        var email = request.Email.Trim();
        if (email.Length is < 5 or > 256 || email.Contains('@', StringComparison.Ordinal) is false)
            return "Jep një adresë email të vlefshme.";

        var first = request.FirstName.Trim();
        var last = request.LastName.Trim();
        if (first.Length is 0 or > 80 || last.Length is 0 or > 80)
            return "Plotëso emrin dhe mbiemrin.";

        var vehicle = request.VehicleType.Trim();
        if (vehicle.Length is 0 or > 64)
            return "Përshkruaj mjetin (p.sh. biçikletë, motor, veturë).";

        var emailNorm = email.ToLowerInvariant();
        if (await _uow.Repository<User, long>().Query.AnyAsync(u => u.Email.ToLower() == emailNorm, cancellationToken))
            return "Ky email është tashmë i regjistruar.";

        if (await _uow.Repository<DriverApplication, long>().Query.AnyAsync(
                a => a.Email.ToLower() == emailNorm
                     && a.Status != PartnerApplicationStatuses.Approved
                     && a.Status != PartnerApplicationStatuses.Rejected,
                cancellationToken))
            return "Ke tashmë një aplikim aktiv me këtë email.";

        var plate = string.IsNullOrWhiteSpace(request.LicensePlate) ? null : request.LicensePlate.Trim();
        if (plate is { Length: > 32 })
            return "Targa është shumë e gjatë.";

        var entity = new DriverApplication
        {
            CreatedAt = DateTime.UtcNow,
            FirstName = first,
            LastName = last,
            Phone = phoneNorm,
            Email = email,
            VehicleType = vehicle,
            LicensePlate = plate,
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Status = PartnerApplicationStatuses.Pending,
        };

        _uow.Repository<DriverApplication, long>().Add(entity);
        await _uow.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyUsersInRolesAsync(
            AdminNotifyRoles,
            "Aplikim i ri deliver",
            $"{first} {last} ({vehicle})",
            NotificationTypes.DriverApplication,
            cancellationToken);

        return null;
    }
}
