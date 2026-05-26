using FoodDelivery.Application.Orders;
using FoodDelivery.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Data;

/// <summary>Shton vlerësime demo në SQL kur restoranti ka ReviewCount por nuk ka rreshta Review.</summary>
internal static class RestaurantReviewsSeeder
{
    private const int RestaurantSubject = 0;
    private const string SeedEmailPrefix = "reviewer.seed";

    private static readonly string[] FirstNames =
    [
        "Edison", "Erleta", "Lorent", "Rona", "Eltoni", "Nehati", "Rionori", "Shpresimi",
    ];

    private static readonly string[] Comments =
    [
        "Shumë e shijshme, do ta porosis përsëri!",
        "Porosia erdhi e nxehtë dhe e paketuar mirë.",
        "Çmimi i drejtë për cilësinë që merr.",
        "Burgerët klasikë janë top — saktësisht si në foto.",
        "Dërgesa e shpejtë, stafi duket i kujdesshëm.",
        "Pjata e veçantë më pëlqeu shumë, porositja e tretë radhë.",
        "Ambiente online e lehtë; porosia pa probleme.",
        "Pakë e vogël vonesë por ushqimi ia vlen.",
        "Sosat dhe shtesat e mirë-organizuara në shportë.",
        "Rekomandoj për darkë të shpejtë me familjen.",
    ];

    public static async Task EnsureSampleReviewsAsync(
        FoodDeliveryDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var restaurants = await db.Restaurants
            .AsNoTracking()
            .Where(r => r.IsActive && r.IsApproved && r.ReviewCount > 0)
            .Select(r => new { r.Id, r.ReviewCount, r.AverageRating, r.DeliveryFee, r.EstimatedDeliveryMinutes })
            .ToListAsync(cancellationToken);

        if (restaurants.Count == 0)
            return;

        var authors = await EnsureAuthorUsersAsync(db, passwordHasher, cancellationToken);
        if (authors.Count == 0)
            return;

        var now = DateTime.UtcNow;
        var added = 0;

        foreach (var r in restaurants)
        {
            var hasReviews = await db.Reviews.AnyAsync(
                x => x.RestaurantId == r.Id && x.Subject == RestaurantSubject,
                cancellationToken);
            if (hasReviews)
                continue;

            var count = Math.Min(r.ReviewCount, 12);
            for (var i = 0; i < count; i++)
            {
                var author = authors[i % authors.Count];
                var address = await db.CustomerAddresses
                    .AsNoTracking()
                    .Where(a => a.UserId == author.Id)
                    .OrderByDescending(a => a.IsDefault)
                    .FirstOrDefaultAsync(cancellationToken);

                if (address is null)
                    continue;

                var subtotal = 8m + (i % 5) * 2.5m;
                var total = subtotal + r.DeliveryFee;
                var order = new Order
                {
                    UserId = author.Id,
                    RestaurantId = r.Id,
                    CustomerAddressId = address.Id,
                    OrderNumber = $"FD-SEED-{r.Id}-{i:D4}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
                    PlacedAt = now.AddDays(-(i + 1) * 2),
                    CreatedAt = now.AddDays(-(i + 1) * 2),
                    Status = OrderStatus.Delivered,
                    FulfillmentType = 0,
                    Subtotal = subtotal,
                    DeliveryFee = r.DeliveryFee,
                    DiscountTotal = 0,
                    Total = total,
                    EstimatedPrepMinutes = r.EstimatedDeliveryMinutes,
                    PlatformFeePercentApplied = 0,
                    PlatformFeeAmount = 0,
                };

                db.Orders.Add(order);
                await db.SaveChangesAsync(cancellationToken);

                db.Reviews.Add(new Review
                {
                    AuthorUserId = author.Id,
                    RestaurantId = r.Id,
                    OrderId = order.Id,
                    Subject = RestaurantSubject,
                    Rating = RatingNearTarget(r.AverageRating, i),
                    Comment = Comments[i % Comments.Length],
                    CreatedAt = order.PlacedAt.AddHours(2),
                    CreatedById = author.Id,
                });

                added++;
            }
        }

        if (added > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("RestaurantReviewsSeeder: u shtuan {N} vlerësime demo.", added);
        }
    }

    private static int RatingNearTarget(decimal avg, int index)
    {
        var target = (double)avg;
        if (target >= 4.6)
            return index % 5 == 0 ? 4 : 5;
        if (target >= 4.2)
            return index % 4 == 0 ? 4 : index % 7 == 0 ? 3 : 5;
        return index % 3 == 0 ? 3 : index % 2 == 0 ? 4 : 5;
    }

    private static async Task<List<User>> EnsureAuthorUsersAsync(
        FoodDeliveryDbContext db,
        IPasswordHasher<User> passwordHasher,
        CancellationToken cancellationToken)
    {
        var customerRole = await db.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == DbSeeder.CustomerRoleName, cancellationToken);
        if (customerRole is null)
            return [];

        var existing = await db.Users
            .Where(u => u.Email.StartsWith(SeedEmailPrefix))
            .ToListAsync(cancellationToken);

        if (existing.Count >= FirstNames.Length)
            return existing;

        var now = DateTime.UtcNow;
        for (var i = existing.Count; i < FirstNames.Length; i++)
        {
            var email = $"{SeedEmailPrefix}{i + 1}@fooddelivery.local";
            if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
                continue;

            var user = new User
            {
                Email = email,
                FirstName = FirstNames[i],
                LastName = "K.",
                Phone = $"+38344{i:D6}",
                IsActive = true,
                CreatedAt = now,
                PasswordHash = string.Empty,
            };
            user.PasswordHash = passwordHasher.HashPassword(user, "Reviewer123!");
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);

            db.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = customerRole.Id,
                AssignedAt = now,
                CreatedAt = now,
            });

            db.CustomerAddresses.Add(new CustomerAddress
            {
                UserId = user.Id,
                Label = "Shtëpi",
                Line1 = "Rruga e vlerësuesve",
                City = "Prishtinë",
                PostalCode = "10000",
                IsDefault = true,
                CreatedAt = now,
            });

            await db.SaveChangesAsync(cancellationToken);
            existing.Add(user);
        }

        return existing;
    }
}
