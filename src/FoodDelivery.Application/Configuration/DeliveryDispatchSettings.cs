namespace FoodDelivery.Application.Configuration;

// Cilësimet për auto-caktimin e korrierit (radius, afat pranimi).
public sealed class DeliveryDispatchSettings
{
    public const string SectionName = "DeliveryDispatch";

    // Distanca maks. restorant → driver për ofertën e parë (km).
    public double SearchRadiusKm { get; set; } = 2.5;

    // Sekonda për të pranuar ofertën para kalimit te driver-i tjetër.
    public int AcceptWindowSeconds { get; set; } = 10;

    // Sa e freskët duhet të jetë GPS e driver-it për t’u përfshirë në auto-dispatch
    public int DriverLocationMaxAgeMinutes { get; set; } = 20;

    // Intervali i background worker-it që kontrollon skadencat (sekonda).
    public int ExpirySweepIntervalSeconds { get; set; } = 4;

    
    // Nëse &gt; 0, përjashto korrierët ku distanca (korrier→restorant) + (restorant→klient Haversine)
    // e kalon këtë vlerë (km). 0 = i çaktivizuar.
   
    public double MaxTotalTripKm { get; set; } = 0;
}
