namespace FoodDelivery.Application.Drivers;

public enum DriverApplicationDocumentKind
{
    Identity = 0,
    License = 1,
    VehiclePhoto = 2,
}

public sealed record DriverApplicationDocumentUpload(
    DriverApplicationDocumentKind Kind,
    Stream Content,
    string FileName,
    string ContentType,
    long SizeBytes);
