using FoodDelivery.Application.Configuration;
using FoodDelivery.Application.Orders;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace FoodDelivery.Infrastructure.Mongo;

public static class MongoDependencyInjection
{
    /// <summary>
    /// MongoDB (NoSQL) — vetëm për chat dërgese. SQL Server mbetet burimi kryesor për admin/restorante/porosi.
    /// </summary>
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

        var enabled = configuration.GetValue("Mongo:Enabled", defaultValue: true);

        if (!enabled)
        {
            services.AddScoped<IDeliveryChatStore, NullDeliveryChatStore>();
            return services;
        }

        services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
        services.AddSingleton(sp =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            return client.GetDatabase(databaseName);
        });
        services.AddScoped<IDeliveryChatStore, MongoDeliveryChatStore>();

        return services;
    }
}
