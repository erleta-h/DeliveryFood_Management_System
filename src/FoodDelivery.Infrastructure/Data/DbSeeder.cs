using FoodDelivery.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Data;

public static class DbSeeder
{
    public const string AdminRoleName = "Admin";
    public const string CustomerRoleName = "Customer";
    public const string AdminSeedEmail = "admin@fooddelivery.local";
    public const string RestaurantStaffRoleName = "RestaurantStaff";
    public const string DriverRoleName = "Driver";
    public const string KitchenSeedEmail = "kitchen@fooddelivery.local";

    public static async Task SeedAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        IPasswordHasher<User> passwordHasher,
        CancellationToken cancellationToken = default)
    {
        await EnsureCustomerRoleAsync(db, logger, cancellationToken);
        await EnsureRestaurantStaffRoleAsync(db, logger, cancellationToken);
        await EnsureDriverRoleAsync(db, logger, cancellationToken);
        await EnsureAdminRoleAsync(db, logger, cancellationToken);
        await EnsureAdminUserAsync(db, passwordHasher, logger, cancellationToken);

        if (await db.Restaurants.AnyAsync(cancellationToken))
        {
            await SeedMenusForRestaurantsWithoutMenuAsync(db, logger, cancellationToken);
            await EnsureKitchenStaffUserAsync(db, passwordHasher, logger, cancellationToken, null);
            logger.LogInformation("DbSeeder: restorantet ekzistojnë — menu/stafi u verifikuan.");
            return;
        }

        var now = DateTime.UtcNow;
        // Idempotent: nëse nisja e mëparshme kishte shtuar kategoritë por dështoi më vonë, mos u përpoq
        // të futesh sërish emra me indeks unik.
        var categories = await EnsureDemoFoodCategoriesAsync(db, now, cancellationToken);

        var pizza = categories[0];
        var burger = categories[1];
        var asian = categories[2];
        var sushi = categories[3];
        var cafe = categories[4];

        var restaurants = new[]
        {
            NewRestaurant("Napoli Pizza House", "napoli-pizza", "Rruga Agim Ramadani 12", "Prishtinë", pizza.Id, 1.50m, 4.6m, 120, 35, 42.6640, 21.1660),
            NewRestaurant("Pronto Pizza", "pronto-pizza", "Lakrishtë 5", "Prishtinë", pizza.Id, 0.99m, 4.4m, 89, 30, 42.6630, 21.1640),
            NewRestaurant("Burger Lab", "burger-lab", "Ulpiana B2", "Prishtinë", burger.Id, 1.20m, 4.7m, 210, 25, 42.6550, 21.1580),
            NewRestaurant("Smoki Grill Prizren", "smoki-grill", "Shadërvan 3", "Prizren", burger.Id, 1.00m, 4.5m, 76, 40, 42.2130, 20.7390),
            NewRestaurant("Wok & Roll", "wok-roll", "Pejton", "Prishtinë", asian.Id, 1.30m, 4.3m, 54, 32, 42.6605, 21.1590),
            NewRestaurant("Bamboo Garden", "bamboo-garden", "Qendra 1", "Pejë", asian.Id, 1.10m, 4.2m, 41, 45, 42.1090, 20.0820),
            NewRestaurant("Sakura Sushi", "sakura-sushi", "Arberi", "Prishtinë", sushi.Id, 2.00m, 4.8m, 95, 38, 42.6520, 21.1720),
            NewRestaurant("Kafja e Vogël", "kafja-e-vogel", "Dragodan", "Prishtinë", cafe.Id, 0.80m, 4.5m, 200, 20, 42.6580, 21.1500),
        };

        db.Restaurants.AddRange(restaurants);
        int v = await db.SaveChangesAsync(cancellationToken);

        await AddMenuForRestaurantsAsync(db, restaurants, now, cancellationToken);
        await EnsureKitchenStaffUserAsync(
            db,
            passwordHasher,
            logger,
            cancellationToken,
            restaurants[0].Id);

        logger.LogInformation(
            "DbSeeder: u shtuan kategoritë, {ResCount} restorante, menu dhe artikuj.",
            restaurants.Length);
    }

    private static async Task SeedMenusForRestaurantsWithoutMenuAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var restaurants = await db.Restaurants.ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var added = 0;
        foreach (var r in restaurants)
        {
            if (await db.MenuCategories.AnyAsync(c => c.RestaurantId == r.Id, cancellationToken))
                continue;
            await AddMenuForSingleRestaurantAsync(db, r.Id, now, cancellationToken);
            added++;
        }

        if (added > 0)
            logger.LogInformation("DbSeeder: u shtua menu për {N} restorante pa artikuj.", added);
    }

    private static async Task AddMenuForRestaurantsAsync(
        FoodDeliveryDbContext db,
        Restaurant[] restaurants,
        DateTime now,
        CancellationToken cancellationToken)
    {
        foreach (var r in restaurants)
            await AddMenuForSingleRestaurantAsync(db, r.Id, now, cancellationToken);
    }

    /// <summary>Kategori + 2 artikuj demo — përdoret nga seed dhe nga miratimi i aplikimit të partnerit.</summary>
    public static async Task AddMenuForSingleRestaurantAsync(
        FoodDeliveryDbContext db,
        long restaurantId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var mc = new MenuCategory
        {
            RestaurantId = restaurantId,
            Name = "Menu kryesor",
            SortOrder = 1,
            CreatedAt = now,
        };
        db.MenuCategories.Add(mc);
        await db.SaveChangesAsync(cancellationToken);

        db.MenuItems.Add(new MenuItem
        {
            MenuCategoryId = mc.Id,
            Name = "Pjata e veçantë",
            Description = "Porosi demo — çmim dhe emër nga menuja.",
            Price = 5.90m,
            IsAvailable = true,
            CreatedAt = now,
        });
        db.MenuItems.Add(new MenuItem
        {
            MenuCategoryId = mc.Id,
            Name = "Pije",
            Description = "Pije e ftohtë",
            Price = 1.50m,
            IsAvailable = true,
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureKitchenStaffUserAsync(
        FoodDeliveryDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILogger logger,
        CancellationToken cancellationToken,
        long? preferredRestaurantId)
    {
        if (await db.Users.AnyAsync(u => u.Email == KitchenSeedEmail, cancellationToken))
            return;

        var role = await db.Roles.AsNoTracking()
            .FirstAsync(r => r.Name == RestaurantStaffRoleName, cancellationToken);

        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = KitchenSeedEmail,
            FirstName = "Kuzhinë",
            LastName = "Napoli",
            Phone = "+38344111222",
            IsActive = true,
            CreatedAt = now,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, "Staff123!");
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        db.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            AssignedAt = now,
            CreatedAt = now,
        });

        long restaurantId;
        if (preferredRestaurantId is { } rid)
            restaurantId = rid;
        else
        {
            restaurantId = await db.Restaurants.AsNoTracking()
                .Where(r => r.Slug == "napoli-pizza")
                .Select(r => r.Id)
                .FirstAsync(cancellationToken);
        }

        db.RestaurantStaff.Add(new RestaurantStaff
        {
            UserId = user.Id,
            RestaurantId = restaurantId,
            Title = "Operator porosish",
            CreatedAt = now,
        });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "DbSeeder: u krijua përdoruesi i kuzhinës {Email} (fjalëkalimi: Staff123!) për restorant Id={Rid}.",
            KitchenSeedEmail,
            restaurantId);
    }

    private static async Task EnsureRestaurantStaffRoleAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await db.Roles.AnyAsync(r => r.Name == RestaurantStaffRoleName, cancellationToken))
            return;

        var now = DateTime.UtcNow;
        db.Roles.Add(new Role
        {
            Name = RestaurantStaffRoleName,
            Description = "Staf restoranti — shikon porositë",
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("DbSeeder: u shtua roli {Role}.", RestaurantStaffRoleName);
    }

    private static async Task EnsureDriverRoleAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await db.Roles.AnyAsync(r => r.Name == DriverRoleName, cancellationToken))
            return;

        var now = DateTime.UtcNow;
        db.Roles.Add(new Role
        {
            Name = DriverRoleName,
            Description = "Deliver — marrje dhe dorëzim porosish",
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("DbSeeder: u shtua roli {Role}.", DriverRoleName);
    }

    private static async Task EnsureAdminRoleAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await db.Roles.AnyAsync(r => r.Name == AdminRoleName, cancellationToken))
            return;

        var now = DateTime.UtcNow;
        db.Roles.Add(new Role
        {
            Name = AdminRoleName,
            Description = "Platformë — aplikimet partner dhe miratimi",
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("DbSeeder: u shtua roli {Role}.", AdminRoleName);
    }

    private static async Task EnsureAdminUserAsync(
        FoodDeliveryDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var adminRole = await db.Roles.AsNoTracking()
            .FirstAsync(r => r.Name == AdminRoleName, cancellationToken);

        var existing = await db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Email == AdminSeedEmail, cancellationToken);

        if (existing is not null)
        {
            var hasAdmin = existing.UserRoles.Any(ur => ur.RoleId == adminRole.Id);
            if (!hasAdmin)
            {
                var now = DateTime.UtcNow;
                db.UserRoles.Add(new UserRole
                {
                    UserId = existing.Id,
                    RoleId = adminRole.Id,
                    AssignedAt = now,
                    CreatedAt = now,
                });
                await db.SaveChangesAsync(cancellationToken);
                logger.LogInformation(
                    "DbSeeder: përdoruesit {Email} iu shtua roli {Role}.",
                    AdminSeedEmail,
                    AdminRoleName);
            }

            return;
        }

        var nowCreate = DateTime.UtcNow;
        var user = new User
        {
            Email = AdminSeedEmail,
            FirstName = "Platform",
            LastName = "Admin",
            Phone = "+38344000000",
            IsActive = true,
            CreatedAt = nowCreate,
            PasswordHash = string.Empty,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, "Admin123!");
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        db.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = adminRole.Id,
            AssignedAt = nowCreate,
            CreatedAt = nowCreate,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "DbSeeder: u krijua admin {Email} (fjalëkalimi: Admin123!) — përdore për /api/admin.",
            AdminSeedEmail);
    }

    private static async Task EnsureCustomerRoleAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await db.Roles.AnyAsync(r => r.Name == CustomerRoleName, cancellationToken))
            return;

        var now = DateTime.UtcNow;
        db.Roles.Add(new Role
        {
            Name = CustomerRoleName,
            Description = "Klient",
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("DbSeeder: u shtua roli {Role}.", CustomerRoleName);
    }

    /// <summary>
    /// Kthen kategoritë demo në të njëjtin rend: krijon mungesat; nëse rreshtat ekzistojnë (indeks unik në emër), i përdor.
    /// Përdor përputhje pa dallim shkronjash dhe <see cref="string.Trim()"/>; kopje të lehta (jo të track-ura) vetëm për
    /// <c>Id</c> — shmang konfuzin e tracking që efektivisht mund të provojë INSERT të dyfishtë në "Pizza" etj.
    /// </summary>
    private static async Task<FoodCategory[]> EnsureDemoFoodCategoriesAsync(
        FoodDeliveryDbContext db,
        DateTime now,
        CancellationToken cancellationToken)
    {
        (string Name, int SortOrder)[] spec =
        {
            ("Pizza", 1),
            ("Burger & grill", 2),
            ("Aziatik", 3),
            ("Sushi", 4),
            ("Kafe & mëngjes", 5),
        };

        // Një round-trip, pa tracking — përndryshe entitetet `Unchanged` ndonjëherë keqinterpretoren në batch-in e
        // Restaurant.AddRange.
        var rows = await db.FoodCategories
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var byName = new Dictionary<string, FoodCategory>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in rows)
        {
            var k = (r.Name ?? string.Empty).Trim();
            if (k.Length == 0)
                continue;
            if (!byName.ContainsKey(k))
                byName[k] = r;
        }

        var list = new List<FoodCategory>(spec.Length);
        var anyNew = false;
        foreach (var (name, sortOrder) in spec)
        {
            var key = name.Trim();
            if (byName.TryGetValue(key, out var found))
            {
                list.Add(new FoodCategory
                {
                    Id = found.Id,
                    Name = name,
                    SortOrder = found.SortOrder,
                    CreatedAt = found.CreatedAt,
                });
                continue;
            }

            anyNew = true;
            var cat = new FoodCategory
            {
                Name = name,
                SortOrder = sortOrder,
                CreatedAt = now,
            };
            db.FoodCategories.Add(cat);
            list.Add(cat);
            byName[key] = cat;
        }

        if (anyNew)
            await db.SaveChangesAsync(cancellationToken);

        return list.ToArray();
    }

    private static Restaurant NewRestaurant(
        string name,
        string slug,
        string address,
        string city,
        long categoryId,
        decimal deliveryFee,
        decimal rating,
        int reviews,
        int etaMin,
        double? latitude = null,
        double? longitude = null)
    {
        var now = DateTime.UtcNow;
        return new Restaurant
        {
            Name = name,
            Slug = slug,
            AddressLine = address,
            City = city,
            Latitude = latitude,
            Longitude = longitude,
            FoodCategoryId = categoryId,
            DeliveryFee = deliveryFee,
            AverageRating = rating,
            ReviewCount = reviews,
            MinOrderAmount = 3m,
            EstimatedDeliveryMinutes = etaMin,
            IsApproved = true,
            IsActive = true,
            CreatedAt = now,
            Description = $"Kuzhinë {name}.",
        };
    }
}
