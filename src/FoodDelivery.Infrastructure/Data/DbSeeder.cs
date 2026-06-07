using FoodDelivery.Application.Security;
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
    public const string SupportRoleName = "Support";

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
            await RestaurantReviewsSeeder.EnsureSampleReviewsAsync(db, passwordHasher, logger, cancellationToken);
            logger.LogInformation("DbSeeder: restorantet ekzistojnë — menu/stafi/vlerësime u verifikuan.");
            return;
        }

        var now = DateTime.UtcNow;

        var categories = new[]
        {
            new FoodCategory { Name = "Pizza", SortOrder = 1, CreatedAt = now },
            new FoodCategory { Name = "Burger & grill", SortOrder = 2, CreatedAt = now },
            new FoodCategory { Name = "Aziatik", SortOrder = 3, CreatedAt = now },
            new FoodCategory { Name = "Sushi", SortOrder = 4, CreatedAt = now },
            new FoodCategory { Name = "Kafe & mëngjes", SortOrder = 5, CreatedAt = now },
        };

        db.FoodCategories.AddRange(categories);
        await db.SaveChangesAsync(cancellationToken);

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
        await db.SaveChangesAsync(cancellationToken);

        await AddMenuForRestaurantsAsync(db, restaurants, now, cancellationToken);

        await EnsureKitchenStaffUserAsync(
            db,
            passwordHasher,
            logger,
            cancellationToken,
            restaurants[0].Id);

        await RestaurantReviewsSeeder.EnsureSampleReviewsAsync(db, passwordHasher, logger, cancellationToken);

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
            Description = "Specialitet i zgjedhur nga menuja e restorantit.",
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
        {
            restaurantId = rid;
        }
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
            "DbSeeder: u krijua përdoruesi i kuzhinës {Email} për restorant Id={Rid}.",
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
            "DbSeeder: u krijua admin {Email} — përdore për /api/admin.",
            AdminSeedEmail);
    }

    public static async Task EnsureRbacAndCmsDefaultsAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        await EnsureRbacPermissionsAsync(db, logger, cancellationToken);
        await EnsureCmsDefaultSettingsAsync(db, logger, cancellationToken);
    }

    private static async Task EnsureRbacPermissionsAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var adminRole = await db.Roles.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Name == AdminRoleName, cancellationToken);

        if (adminRole is null)
            return;

        var addedPerm = 0;

        foreach (var name in PermissionNames.All)
        {
            var perm = await db.Permissions.FirstOrDefaultAsync(p => p.Name == name, cancellationToken);

            if (perm is null)
            {
                perm = new Permission
                {
                    Name = name,
                    Description = $"Leje: {name}",
                    CreatedAt = now,
                };

                db.Permissions.Add(perm);
                await db.SaveChangesAsync(cancellationToken);
                addedPerm++;
            }

            var existsLink = await db.RolePermissions.AnyAsync(
                rp => rp.RoleId == adminRole.Id && rp.PermissionId == perm.Id,
                cancellationToken);

            if (!existsLink)
            {
                db.RolePermissions.Add(new RolePermission
                {
                    RoleId = adminRole.Id,
                    PermissionId = perm.Id,
                    CreatedAt = now,
                });

                await db.SaveChangesAsync(cancellationToken);
            }
        }

        if (addedPerm > 0)
            logger.LogInformation("DbSeeder: u shtuan {N} leje të reja RBAC.", addedPerm);

        await EnsureSupportRoleAndPermissionAsync(db, now, logger, cancellationToken);
    }

    private static async Task EnsureSupportRoleAndPermissionAsync(
        FoodDeliveryDbContext db,
        DateTime now,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var supportRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == SupportRoleName, cancellationToken);

        if (supportRole is null)
        {
            supportRole = new Role
            {
                Name = SupportRoleName,
                Description = "Support — tiketa klientësh",
                CreatedAt = now,
            };

            db.Roles.Add(supportRole);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("DbSeeder: u shtua roli {Role}.", SupportRoleName);
        }

        var perm = await db.Permissions.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Name == PermissionNames.AdminSupport, cancellationToken);

        if (perm is null)
            return;

        var existsLink = await db.RolePermissions.AnyAsync(
            rp => rp.RoleId == supportRole.Id && rp.PermissionId == perm.Id,
            cancellationToken);

        if (existsLink)
            return;

        db.RolePermissions.Add(new RolePermission
        {
            RoleId = supportRole.Id,
            PermissionId = perm.Id,
            CreatedAt = now,
        });

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "DbSeeder: rolit {Role} iu lidh leja {Perm}.",
            SupportRoleName,
            PermissionNames.AdminSupport);
    }

    /// <summary>Vlera fillestare per CMS (faqja kryesore) — jo te dhena biznesi.</summary>
    private static async Task EnsureCmsDefaultSettingsAsync(
        FoodDeliveryDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var defaults = new (string Key, string Value, string? Description)[]
        {
        ("cms.landing.hero_title", "Porosit ushqimin e preferuar", "Titulli kryesor i landing"),
        ("cms.landing.hero_highlight", "në derën tënde", "Fragmenti me theks (gradient) në titull"),
        (
            "cms.landing.hero_subtitle",
            "Zbulo restorante të mrekullueshme pranë teje, porosit online dhe shijo ushqimin e preferuar pa dalë nga shtëpia.",
            "Nëntitulli nën hero"),
        ("cms.landing.hero_cta", "Porosit Tani", "Teksti i butonit kryesor (CTA)"),
        ("cms.landing.hero_background_image", "", "URL e figurës së sfondit të hero (1920×1080 rekomandohet)"),
        ("cms.landing.how_it_works_title", "Si funksionon?", "Titulli i seksionit How It Works"),
        ("cms.landing.how_it_works_step_1_title", "Zgjedh restorantin", "Titulli i hapit 1"),
        ("cms.landing.how_it_works_step_1_body", "Zbulo restorante dhe menu të ndryshme.", "Përshkrimi i hapit 1"),
        ("cms.landing.how_it_works_step_2_title", "Bën porosinë", "Titulli i hapit 2"),
        ("cms.landing.how_it_works_step_2_body", "Shto produktet që dëshiron në shportë.", "Përshkrimi i hapit 2"),
        ("cms.landing.how_it_works_step_3_title", "Merr dorëzimin", "Titulli i hapit 3"),
        ("cms.landing.how_it_works_step_3_body", "Shoferi vjen në derën tënde, e shpejtë dhe e sigurt.", "Përshkrimi i hapit 3"),
        ("cms.landing.restaurants_title", "Restorantet më të preferuara", "Titulli i seksionit restorante"),
        ("cms.landing.restaurants_subtitle", "Restorantet më të vlerësuara nga klientët tanë.", "Nëntitulli i seksionit restorante"),
        ("cms.landing.restaurants_cta_label", "Shiko të gjitha", "Teksti i linkut CTA restorante"),
        ("cms.landing.categories_title", "Kategoritë", "Titulli i seksionit kategoritë"),
        ("cms.landing.categories_subtitle", "Gjej ushqimin që të pëlqen.", "Nëntitulli i seksionit kategoritë"),
        ("cms.landing.testimonials_title", "Çfarë thonë klientët", "Titulli i seksionit testimoniale"),
        ("cms.landing.testimonial_1_name", "Arben K.", "Emri i testimonialit 1"),
        ("cms.landing.testimonial_1_quote", "Dorëzim super i shpejtë dhe ushqim i freskët!", "Citimi i testimonialit 1"),
        ("cms.landing.testimonial_2_name", "Elira M.", "Emri i testimonialit 2"),
        ("cms.landing.testimonial_2_quote", "Platforma më e lehtë për të porositur online.", "Citimi i testimonialit 2"),
        ("cms.landing.testimonial_3_name", "Driton H.", "Emri i testimonialit 3"),
        ("cms.landing.testimonial_3_quote", "Restorante të shumta dhe çmime të mira.", "Citimi i testimonialit 3"),
        ("cms.landing.footer_tagline", "Ushqim i shpejtë, në derën tënde.", "Tagline në footer"),
        ("cms.landing.footer_copyright", "© 2026 FoodDelivery. Të gjitha të drejtat e rezervuara.", "Copyright në footer"),
        ("cms.landing.footer_link_restaurants", "Restorantet", "Etiketa e linkut restorante në footer"),
        ("cms.landing.footer_link_categories", "Kategoritë", "Etiketa e linkut kategoritë në footer"),
        ("cms.landing.footer_link_partner", "Bëhu partner", "Etiketa e linkut partner në footer"),
        ("cms.landing.partner_eyebrow", "Për restorante & biznese", "Etiketa mbi seksionin partner"),
        ("cms.landing.partner_title", "Bëhu partner me ne", "Titulli i seksionit partner"),
        (
            "cms.landing.partner_body",
            "Nëse dëshiron të listosh menunë dhe të marrësh porosi përmes platformës, apliko fillimisht këtu. Ekipi ynë shqyrton çdo kërkesë; pas kontratës dhe miratimit, hapet aksesi në panel — nuk krijohet llogari pa atë hap.",
            "Teksti përshkrues partner"),
        };

        var now = DateTime.UtcNow;
        var added = 0;

        foreach (var (key, value, desc) in defaults)
        {
            if (await db.Settings.AnyAsync(s => s.Key == key, cancellationToken))
                continue;

            db.Settings.Add(new Setting
            {
                Key = key,
                Value = value,
                Description = desc,
                CreatedAt = now,
            });

            added++;
        }

        if (added > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("DbSeeder: u shtuan {N} çelësa të paracaktuar CMS.", added);
        }
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