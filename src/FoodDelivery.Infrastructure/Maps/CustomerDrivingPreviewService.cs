using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Maps;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Maps;

public sealed class CustomerDrivingPreviewService : ICustomerDrivingPreviewService
{
    private readonly IUnitOfWork _uow;
    private readonly IGoogleMapsDistanceService _distance;
    private readonly GoogleMapsSettings _maps;

    public CustomerDrivingPreviewService(
        IUnitOfWork uow,
        IGoogleMapsDistanceService distance,
        IOptions<GoogleMapsSettings> maps)
    {
        _uow = uow;
        _distance = distance;
        _maps = maps.Value;
    }

    public async Task<DrivingPreviewResponse> GetDrivingToRestaurantAsync(
        long userId,
        long restaurantId,
        CancellationToken cancellationToken = default)
    {
        var serverConfigured = !string.IsNullOrWhiteSpace(_maps.ServerApiKey);

        var restaurant = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
            .Where(r => r.Id == restaurantId && r.IsActive && r.IsApproved)
            .Select(r => new { r.Latitude, r.Longitude })
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurant is null)
        {
            return new DrivingPreviewResponse(
                serverConfigured,
                false,
                null,
                null,
                "Restoranti nuk u gjet.");
        }

        var addr = await _uow.Repository<CustomerAddress, long>().Query.AsNoTracking()
            .Where(a => a.UserId == userId && a.IsDefault)
            .FirstOrDefaultAsync(cancellationToken);
        addr ??= await _uow.Repository<CustomerAddress, long>().Query.AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .FirstOrDefaultAsync(cancellationToken);

        if (addr?.Latitude is null || addr.Longitude is null
            || restaurant.Latitude is null || restaurant.Longitude is null)
        {
            return new DrivingPreviewResponse(
                serverConfigured,
                false,
                null,
                null,
                "Për distancë me makinë duhen koordinata GPS te adresa jote dhe te restoranti.");
        }

        if (!serverConfigured)
        {
            return new DrivingPreviewResponse(
                false,
                true,
                null,
                null,
                "Distance Matrix nuk është konfiguruar në server.");
        }

        var matrix = await _distance.GetDrivingAsync(
            addr.Latitude.Value,
            addr.Longitude.Value,
            restaurant.Latitude.Value,
            restaurant.Longitude.Value,
            cancellationToken);

        if (!matrix.Success)
        {
            return new DrivingPreviewResponse(
                true,
                true,
                null,
                null,
                matrix.ErrorMessage ?? "Nuk llogaritet distanca.");
        }

        return new DrivingPreviewResponse(true, true, matrix.DistanceMeters, matrix.DurationSeconds, null);
    }
}
