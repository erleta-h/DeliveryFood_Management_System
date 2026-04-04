namespace FoodDelivery.Application.Restaurants;

/// <summary>
/// Renditja e listës së restoranteve në katalog — përputhet me filtrat e aplikacionit klient.
/// </summary>
public enum RestaurantListSort
{
    /// <summary>Së pari vlerësimi më i lartë, pastaj më shumë shqyrtime.</summary>
    Rating = 0,

    /// <summary>Më pak minuta dërgesë së pari (shpejtësia e vlerësuar).</summary>
    EstimatedDelivery = 1,

    /// <summary>Emri alfabetik.</summary>
    Name = 2,

    /// <summary>Tarifa më e ulët e dërgesës së pari.</summary>
    DeliveryFee = 3,
}
