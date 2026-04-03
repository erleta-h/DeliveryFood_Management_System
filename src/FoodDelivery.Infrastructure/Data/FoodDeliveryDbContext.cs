using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Data;

public class FoodDeliveryDbContext : DbContext
{
    public FoodDeliveryDbContext(DbContextOptions<FoodDeliveryDbContext> options)
        : base(options)
    {
    }

    public DbSet<FoodCategory> FoodCategories => Set<FoodCategory>();
    public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<RestaurantStaff> RestaurantStaff => Set<RestaurantStaff>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.Property(x => x.Phone).HasMaxLength(32);
            e.HasOne(x => x.CreatedBy)
                .WithMany(x => x.CreatedUsers)
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.UpdatedBy)
                .WithMany(x => x.UpdatedUsers)
                .HasForeignKey(x => x.UpdatedById)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Role>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<UserRole>(e =>
        {
            e.HasOne(x => x.Role)
                .WithMany(x => x.UserRoles)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
                .WithMany(x => x.UserRoles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.RoleId }).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.CreatedById);
            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UpdatedById);
        });

        modelBuilder.Entity<FoodCategory>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<Restaurant>(e =>
        {
            e.Property(x => x.DeliveryFee).HasPrecision(18, 2);
            e.Property(x => x.MinOrderAmount).HasPrecision(18, 2);
            e.Property(x => x.AverageRating).HasPrecision(3, 2);
            e.HasOne(x => x.FoodCategory)
                .WithMany(x => x.Restaurants)
                .HasForeignKey(x => x.FoodCategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Slug)
                .IsUnique()
                .HasFilter("[Slug] IS NOT NULL");
        });

        modelBuilder.Entity<MenuCategory>(e =>
        {
            e.HasOne(x => x.Restaurant)
                .WithMany(x => x.MenuCategories)
                .HasForeignKey(x => x.RestaurantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MenuItem>(e =>
        {
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.HasOne(x => x.MenuCategory)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.MenuCategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RestaurantStaff>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(x => x.RestaurantStaffMemberships)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Restaurant)
                .WithMany(x => x.Staff)
                .HasForeignKey(x => x.RestaurantId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.RestaurantId }).IsUnique();
        });
    }
}
