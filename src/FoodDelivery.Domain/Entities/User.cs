namespace FoodDelivery.Domain.Entities;

public class User
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string LastName { get; set; } = string.Empty;
    /// <summary>Numër telefoni për kontakt (porosi, dërgesë).</summary>
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }

    /// <summary>Hyrja e fundit me sukses (opsionale).</summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Email i verifikuar (nëse më vonë shton verifikim).</summary>
    public bool EmailConfirmed { get; set; }

    public User? CreatedBy { get; set; }
    public User? UpdatedBy { get; set; }
    public ICollection<User> CreatedUsers { get; set; } = new List<User>();
    public ICollection<User> UpdatedUsers { get; set; } = new List<User>();

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<RestaurantStaff> RestaurantStaffMemberships { get; set; } = new List<RestaurantStaff>();
    public ICollection<Review> DriverReviews { get; set; } = new List<Review>();
    public ICollection<Review> ReviewsWritten { get; set; } = new List<Review>();
}