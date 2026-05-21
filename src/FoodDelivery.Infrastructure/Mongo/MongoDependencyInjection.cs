using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Orders;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace FoodDelivery.Infrastructure.Mongo;

public static class MongoDependencyInjection
{
    public static IServiceCollection AddMongoDb(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MongoSettings>(configuration.GetSection(MongoSettings.SectionName));

        var settings = configuration.GetSection(MongoSettings.SectionName).Get<MongoSettings>()
            ?? new MongoSettings();

        var connectionString = configuration["Mongo:ConnectionString"]
            ?? configuration["Mongo__ConnectionString"]
            ?? settings.ConnectionString;

        var databaseName = configuration["Mongo:DatabaseName"]
            ?? configuration["Mongo__DatabaseName"]
            ?? settings.DatabaseName;

        services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
        services.AddSingleton(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(databaseName));

        services.AddScoped<IDeliveryChatStore, MongoDeliveryChatStore>();

        return services;
    }
}
