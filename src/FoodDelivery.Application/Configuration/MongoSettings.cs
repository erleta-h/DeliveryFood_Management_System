namespace FoodDelivery.Application.Configuration;

public class MongoSettings
{
    public const string SectionName = "Mongo";

    public string ConnectionString { get; set; } = "mongodb://localhost:27017";

    public string DatabaseName { get; set; } = "FoodDelivery";

    public string DeliveryChatCollection { get; set; } = "delivery_chat_messages";
}
