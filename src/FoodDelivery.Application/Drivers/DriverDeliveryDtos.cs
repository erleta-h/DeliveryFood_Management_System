namespace FoodDelivery.Application.Drivers;

public record DriverDeliveryRowDto(
    long OrderId,
    string OrderNumber,
    string RestaurantName,
    string RestaurantAddressLine,
    string RestaurantCity,
    string? RestaurantPhone,
    double? RestaurantLatitude,
    double? RestaurantLongitude,
    string CustomerAddressLine1,
    string CustomerCity,
    string? CustomerPostalCode,
    double? CustomerLatitude,
    double? CustomerLongitude,
    string CustomerFirstName,
    string CustomerLastName,
    string? CustomerPhone,
    int OrderStatus,
    int DriverLegStatus,
    string? CustomerNotes,
    string ContactPhone,
    DateTime PlacedAtUtc,
    DateTime? OfferedAtUtc,
    //Sekonda të mbetura për pranim (null nëse nuk kërkon pranim)
    int? AcceptSecondsRemaining,
    double? DistanceToRestaurantKm,
    double? DistanceRestaurantToCustomerKm,
    decimal EstimatedDriverPayout,
    int EstimatedTotalMinutes,
    bool RequiresAccept,
    bool CanMarkArrivedRestaurant,
    bool CanMarkPickedUp,
    bool CanMarkDelivered,
    decimal OrderTotal,
    string PaymentMethodLabel,
    bool CashCollectAtDoor);

public record DriverActiveOrderDetailDto(
    long OrderId,
    string OrderNumber,
    int OrderStatus,
    int DriverLegStatus,
    string? CustomerNotes,
    DateTime PlacedAtUtc,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal Total,
    string PaymentMethodLabel,
    bool CashCollectAtDoor,
    decimal? CashToCollect,
    DriverPartyDto Restaurant,
    DriverPartyDto Customer,
    IReadOnlyList<DriverOrderLineDto> Lines);

public record DriverPartyDto(
    string DisplayName,
    string AddressLine,
    string City,
    string? PostalCode,
    double? Latitude,
    double? Longitude,
    string? Phone);

public record DriverOrderLineDto(string Name, int Quantity, decimal UnitPrice);

public record DriverStatusDto(
    bool IsOnline,
    bool IsBusy,
    int SecondsOnlineToday,
    DateTime? OnlineSinceUtc,
    double? LastLatitude,
    double? LastLongitude,
    DateTime? LastLocationAtUtc);

public record DriverEarningsDto(
    decimal TodayTotal,
    int TodayDeliveriesCount,
    decimal WeekTotal,
    int WeekDeliveriesCount,
    decimal BonusesTotal);

public record DriverHistoryRowDto(
    long OrderId,
    string OrderNumber,
    DateTime DeliveredAtUtc,
    decimal DriverPayout,
    int? CustomerRating);

public record DriverPerformanceDto(
    double AverageRating,
    int RatingsCount,
    double AcceptanceRatePercent,
    double DeclineRatePercent,
    int OffersAccepted,
    int OffersDeclined,
    int OffersTimedOut,
    string? PerformanceHint);

public record DriverNotificationRowDto(
    long Id,
    string Title,
    string Message,
    string Type,
    DateTime CreatedAtUtc,
    bool IsRead);

//Përmbledhje biznesi + kontakt për panelin «Profili Deliver».
public record DriverAccountProfileDto(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string Line1,
    string City,
    string? PostalCode,
    string VehicleType,
    string? LicensePlate,
    DateTime PartnerSinceUtc,
    bool IsOnline,
    //complete | incomplete — në bazë të të dhënave të mjetit.
    string VerificationStatus,
    string VerificationSummary,
    decimal TodayEarnings,
    int TodayDeliveriesCount,
    decimal WeekEarnings,
    int WeekDeliveriesCount,
    double AverageRating,
    int RatingsCount,
    double AcceptanceRatePercent,
    string? GpsStatusHint,
    string? NextStepHint);
