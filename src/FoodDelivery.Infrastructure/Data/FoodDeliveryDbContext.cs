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

    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<RestaurantStaff> RestaurantStaff => Set<RestaurantStaff>();
    public DbSet<Role> Roles => Set<Role>();

    public DbSet<Permission> Permissions => Set<Permission>();       // Kom shtu
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>(); // Kom shtu

    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<SupportTicketMessage> SupportTicketMessages => Set<SupportTicketMessage>();

    public DbSet<SupportTicketAudit> SupportTicketAudits => Set<SupportTicketAudit>();

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<RestaurantPartnerApplication> RestaurantPartnerApplications => Set<RestaurantPartnerApplication>();
    public DbSet<DriverApplication> DriverApplications => Set<DriverApplication>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Review> Reviews => Set<Review>();

    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<FavoriteRestaurant> FavoriteRestaurants => Set<FavoriteRestaurant>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderCoupon> OrderCoupons => Set<OrderCoupon>();
    public DbSet<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<DriverProfile> DriverProfiles => Set<DriverProfile>();

  

    public DbSet<Setting> Settings => Set<Setting>();



    public DbSet<WebPushSubscription> WebPushSubscriptions => Set<WebPushSubscription>();
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

        modelBuilder.Entity<DriverApplication>(e =>
        {
            e.ToTable("DriverApplications");
            e.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
            e.Property(x => x.LastName).HasMaxLength(80).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(32).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.VehicleType).HasMaxLength(64).IsRequired();
            e.Property(x => x.LicensePlate).HasMaxLength(32);
            e.Property(x => x.Message).HasMaxLength(2000);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.Email);
            e.HasIndex(x => x.Status);
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

        modelBuilder.Entity<FavoriteRestaurant>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.RestaurantId }).IsUnique();
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Restaurant)
                .WithMany(x => x.FavoritedBy)
                .HasForeignKey(x => x.RestaurantId)
                .OnDelete(DeleteBehavior.Cascade);
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
            e.ToTable("MenuItems");
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.HasOne(x => x.ImageFile)
                .WithMany()
                .HasForeignKey(x => x.ImageFileId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.MenuCategory)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.MenuCategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoredFile>(e =>
        {
            // InitialCreate: dbo.Files, kolona UploadedBy (jo StoredFiles / UploaderId).
            e.ToTable("Files");
            e.Property(x => x.UploaderId).HasColumnName("UploadedBy");
            e.Ignore(x => x.CreatedById);
            e.Ignore(x => x.UpdatedAt);
            e.Ignore(x => x.UpdatedById);
            e.HasOne(x => x.Uploader)
                .WithMany()
                .HasForeignKey(x => x.UploaderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(x => x.Notifications)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UpdatedById)
                .OnDelete(DeleteBehavior.NoAction);
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
        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("Payments");
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Order)
                .WithMany(x => x.Payments)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<Review>(e =>
        {
            e.ToTable("Reviews");
            e.HasOne(x => x.Author)
                .WithMany(x => x.ReviewsWritten)
                .HasForeignKey(x => x.AuthorUserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Driver)
                .WithMany(x => x.DriverReviews)
                .HasForeignKey(x => x.DriverUserId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.Order)
                .WithMany(x => x.Reviews)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Restaurant)
                .WithMany(x => x.Reviews)
                .HasForeignKey(x => x.RestaurantId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => new { x.OrderId, x.Subject }).IsUnique();
        });

        modelBuilder.Entity<CustomerAddress>(e =>
        {
            e.ToTable("CustomerAddresses");
            e.HasOne(x => x.User)
                .WithMany(x => x.Addresses)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.ToTable("Orders");
            e.Property(x => x.Subtotal).HasPrecision(18, 2);
            e.Property(x => x.DeliveryFee).HasPrecision(18, 2);
            e.Property(x => x.DiscountTotal).HasPrecision(18, 2);
            e.Property(x => x.PlatformFeeAmount).HasPrecision(18, 2);
            e.Property(x => x.PlatformFeePercentApplied).HasPrecision(18, 2);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.HasIndex(x => x.OrderNumber).IsUnique();
        });

        modelBuilder.Entity<OrderItem>(e =>
        {
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.HasOne(x => x.Order)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Delivery>(e =>
        {
            e.ToTable("Deliveries");
            e.HasIndex(x => x.OrderId).IsUnique();
            e.HasOne(x => x.Order)
                .WithOne(x => x.Delivery)
                .HasForeignKey<Delivery>(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Driver)
                .WithMany(x => x.Deliveries)
                .HasForeignKey(x => x.DriverUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DriverProfile>(e =>
        {
            e.ToTable("DriverProfiles");
            e.HasKey(x => x.UserId);
            e.HasOne(x => x.User)
                .WithOne(x => x.DriverProfile)
                .HasForeignKey<DriverProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("AuditLogs");
        });

        modelBuilder.Entity<Setting>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
        });

    


        modelBuilder.Entity<WebPushSubscription>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(x => x.WebPushSubscriptions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.Endpoint).HasMaxLength(2048).IsRequired();
            e.Property(x => x.P256dh).HasMaxLength(256).IsRequired();
            e.Property(x => x.Auth).HasMaxLength(128).IsRequired();
            e.HasIndex(x => x.Endpoint).IsUnique();
        });

        modelBuilder.Entity<SupportTicket>(e =>
        {
            e.ToTable("SupportTickets");
            e.Property(x => x.Subject).HasMaxLength(200).IsRequired();
            e.Property(x => x.Body).HasMaxLength(4000).IsRequired();
            e.Property(x => x.AdminNote).HasMaxLength(2000);
            e.HasOne(x => x.User)
                .WithMany(x => x.SupportTickets)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Order)
                .WithMany()
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Restaurant)
                .WithMany()
                .HasForeignKey(x => x.RestaurantId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.OrderId);
            e.HasIndex(x => x.RestaurantId);

            e.HasOne(x => x.Driver)
                .WithMany()
                .HasForeignKey(x => x.DriverId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.AssignedTo)
                .WithMany()
                .HasForeignKey(x => x.AssignedToUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<SupportTicketMessage>(e =>
        {
            e.ToTable("SupportTicketMessages");
            e.Property(x => x.Body).HasMaxLength(4000).IsRequired();
            e.HasOne(x => x.SupportTicket)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.SupportTicketId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Author)
                .WithMany(x => x.SupportTicketMessages)
                .HasForeignKey(x => x.AuthorUserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.SupportTicketId);
            e.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<SupportTicketAudit>(e =>
        {
            e.ToTable("SupportTicketAudits");
            e.Property(x => x.Action).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.SupportTicket)
                .WithMany(x => x.Audits)
                .HasForeignKey(x => x.SupportTicketId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Actor)
                .WithMany()
                .HasForeignKey(x => x.ActorUserId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(x => x.SupportTicketId);
            e.HasIndex(x => x.CreatedAt);
        });
    }
}
