namespace FoodDelivery.Application.SiteContent;

public sealed record PublicLandingContentDto(
    string HeroTitle,
    string HeroHighlight,
    string HeroSubtitle,
    string PartnerEyebrow,
    string PartnerTitle,
    string PartnerBody);

public interface IPublicSiteContentService
{
    Task<PublicLandingContentDto> GetLandingAsync(CancellationToken cancellationToken = default);
}
