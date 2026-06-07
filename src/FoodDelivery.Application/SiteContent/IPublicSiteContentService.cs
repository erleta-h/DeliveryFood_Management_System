namespace FoodDelivery.Application.SiteContent;

public sealed record PublicLandingContentDto(
    string HeroTitle,
    string HeroHighlight,
    string HeroSubtitle,
    string HeroCta,
    string HeroBackgroundImage,
    string HowItWorksTitle,
    string HowItWorksStep1Title,
    string HowItWorksStep1Body,
    string HowItWorksStep2Title,
    string HowItWorksStep2Body,
    string HowItWorksStep3Title,
    string HowItWorksStep3Body,
    string RestaurantsTitle,
    string RestaurantsSubtitle,
    string RestaurantsCtaLabel,
    string CategoriesTitle,
    string CategoriesSubtitle,
    string TestimonialsTitle,
    string Testimonial1Name,
    string Testimonial1Quote,
    string Testimonial2Name,
    string Testimonial2Quote,
    string Testimonial3Name,
    string Testimonial3Quote,
    string FooterTagline,
    string FooterCopyright,
    string FooterLinkRestaurants,
    string FooterLinkCategories,
    string FooterLinkPartner,
    string PartnerEyebrow,
    string PartnerTitle,
    string PartnerBody);

public interface IPublicSiteContentService
{
    Task<PublicLandingContentDto> GetLandingAsync(CancellationToken cancellationToken = default);
}
