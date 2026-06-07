using FoodDelivery.Application.Notifications;
using FoodDelivery.Application.Partners;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Auth;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Partners;

public sealed class PartnerApplicationService : IPartnerApplicationService
{
    private static readonly string[] AdminNotifyRoles = ["Admin", "Support"];

    private readonly FoodDeliveryDbContext _db;
    private readonly INotificationPublisher _notifications;

    public PartnerApplicationService(FoodDeliveryDbContext db, INotificationPublisher notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<string?> SubmitAsync(
        SubmitPartnerApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!PhoneValidation.TryNormalize(request.Phone, out var phoneNorm, out var phoneErr))
            return phoneErr;

        var email = request.Email.Trim();
        if (email.Length is < 5 or > 256 || email.Contains('@', StringComparison.Ordinal) is false)
            return "Jep një adresë email të vlefshme.";

        var country = request.Country.Trim();
        if (country.Length is 0 or > 64)
            return "Zgjidh ose shkruaj vendin.";

        var venue = request.VenueName.Trim();
        if (venue.Length is 0 or > 200)
            return "Emri i lokacionit është i detyrueshëm (maks. 200 gërma).";

        var street = request.StreetAddress.Trim();
        if (street.Length is 0 or > 300)
            return "Adresa e rrugës është e detyrueshme.";

        var city = request.City.Trim();
        if (city.Length is 0 or > 120)
            return "Qyteti është i detyrueshëm.";

        var first = request.ContactFirstName.Trim();
        var last = request.ContactLastName.Trim();
        if (first.Length is 0 or > 80 || last.Length is 0 or > 80)
            return "Jep emrin dhe mbiemrin e kontaktit.";

        var entity = new RestaurantPartnerApplication
        {
            CreatedAt = DateTime.UtcNow,
            Country = country,
            BusinessType = Trunc(request.BusinessType.Trim(), 80),
            VenueCountLabel = Trunc(request.VenueCountLabel.Trim(), 32),
            VenueName = venue,
            StreetAddress = street,
            PostalCode = Trunc(request.PostalCode.Trim(), 16),
            City = city,
            ContactFirstName = first,
            ContactLastName = last,
            Phone = phoneNorm,
            Email = email,
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Status = 0,
        };

        _db.RestaurantPartnerApplications.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            PartnerApplicationAuditWriter.Add(
                _db,
                entity.Id,
                PartnerApplicationAuditEventTypes.ApplicationSubmitted,
                null,
                null,
                entity.CreatedAt);
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            /* audit table mund të mungojë deri sa të aplikohet migrimi */
        }

        await _notifications.NotifyUsersInRolesAsync(
            AdminNotifyRoles,
            "Aplikim i ri partner",
            $"{venue} ({city}) — {first} {last}",
            NotificationTypes.PartnerApplication,
            cancellationToken);

        return null;
    }

    private static string Trunc(string s, int max) =>
        s.Length <= max ? s : s[..max];
}
