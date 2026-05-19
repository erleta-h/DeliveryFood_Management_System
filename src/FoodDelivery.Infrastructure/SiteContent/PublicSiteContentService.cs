using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.SiteContent;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.SiteContent;

public sealed class PublicSiteContentService : IPublicSiteContentService
{
    private readonly IUnitOfWork _uow;

    public PublicSiteContentService(IUnitOfWork uow) => _uow = uow;

    public async Task<PublicLandingContentDto> GetLandingAsync(CancellationToken cancellationToken = default)
    {
        var keys = new[]
        {
            "cms.landing.hero_title",
            "cms.landing.hero_highlight",
            "cms.landing.hero_subtitle",
            "cms.landing.partner_eyebrow",
            "cms.landing.partner_title",
            "cms.landing.partner_body",
        };
        var map = await _uow.Repository<Setting, long>().Query.AsNoTracking()
            .Where(s => keys.Contains(s.Key))
            .ToDictionaryAsync(s => s.Key, s => s.Value ?? string.Empty, cancellationToken);

        static string G(Dictionary<string, string> m, string k, string d) =>
            m.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v) ? v : d;

        return new PublicLandingContentDto(
            G(map, "cms.landing.hero_title", "Ushqim i shpejtë, në derën tënde"),
            G(map, "cms.landing.hero_highlight", "në derën tënde"),
            G(
                map,
                "cms.landing.hero_subtitle",
                "Zbulo restorante, porosit online dhe ndiq porositë — me llogari, adresë dhe qytet për dorëzim të saktë."),
            G(map, "cms.landing.partner_eyebrow", "Për restorante & biznese"),
            G(map, "cms.landing.partner_title", "Bëhu partner me ne"),
            G(
                map,
                "cms.landing.partner_body",
                "Nëse dëshiron të listosh menunë dhe të marrësh porosi përmes platformës, apliko fillimisht këtu."));
    }
}
