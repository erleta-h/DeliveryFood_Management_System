using FoodDelivery.Application.Persistence;
using FoodDelivery.Application.SiteContent;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.SiteContent;

public sealed class PublicSiteContentService : IPublicSiteContentService
{
    private readonly IUnitOfWork _uow;

    public PublicSiteContentService(IUnitOfWork uow) => _uow = uow;

    private static readonly string[] Keys =
    [
        "cms.landing.hero_title",
        "cms.landing.hero_highlight",
        "cms.landing.hero_subtitle",
        "cms.landing.hero_cta",
        "cms.landing.hero_background_image",
        "cms.landing.how_it_works_title",
        "cms.landing.how_it_works_step_1_title",
        "cms.landing.how_it_works_step_1_body",
        "cms.landing.how_it_works_step_2_title",
        "cms.landing.how_it_works_step_2_body",
        "cms.landing.how_it_works_step_3_title",
        "cms.landing.how_it_works_step_3_body",
        "cms.landing.restaurants_title",
        "cms.landing.restaurants_subtitle",
        "cms.landing.restaurants_cta_label",
        "cms.landing.categories_title",
        "cms.landing.categories_subtitle",
        "cms.landing.testimonials_title",
        "cms.landing.testimonial_1_name",
        "cms.landing.testimonial_1_quote",
        "cms.landing.testimonial_2_name",
        "cms.landing.testimonial_2_quote",
        "cms.landing.testimonial_3_name",
        "cms.landing.testimonial_3_quote",
        "cms.landing.footer_tagline",
        "cms.landing.footer_copyright",
        "cms.landing.footer_link_restaurants",
        "cms.landing.footer_link_categories",
        "cms.landing.footer_link_partner",
        "cms.landing.partner_eyebrow",
        "cms.landing.partner_title",
        "cms.landing.partner_body",
    ];

    public async Task<PublicLandingContentDto> GetLandingAsync(CancellationToken cancellationToken = default)
    {
        var map = await _uow.Repository<Setting, long>().Query.AsNoTracking()
            .Where(s => Keys.Contains(s.Key))
            .ToDictionaryAsync(s => s.Key, s => s.Value ?? string.Empty, cancellationToken);

        static string G(Dictionary<string, string> m, string k, string d) =>
            m.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v) ? v : d;

        return new PublicLandingContentDto(
            G(map, "cms.landing.hero_title", "Porosit ushqimin e preferuar"),
            G(map, "cms.landing.hero_highlight", "në derën tënde"),
            G(
                map,
                "cms.landing.hero_subtitle",
                "Zbulo restorante të mrekullueshme pranë teje, porosit online dhe shijo ushqimin e preferuar pa dalë nga shtëpia."),
            G(map, "cms.landing.hero_cta", "Porosit Tani"),
            G(map, "cms.landing.hero_background_image", ""),
            G(map, "cms.landing.how_it_works_title", "Si funksionon?"),
            G(map, "cms.landing.how_it_works_step_1_title", "Zgjedh restorantin"),
            G(map, "cms.landing.how_it_works_step_1_body", "Zbulo restorante dhe menu të ndryshme."),
            G(map, "cms.landing.how_it_works_step_2_title", "Bën porosinë"),
            G(map, "cms.landing.how_it_works_step_2_body", "Shto produktet që dëshiron në shportë."),
            G(map, "cms.landing.how_it_works_step_3_title", "Merr dorëzimin"),
            G(map, "cms.landing.how_it_works_step_3_body", "Shoferi vjen në derën tënde, e shpejtë dhe e sigurt."),
            G(map, "cms.landing.restaurants_title", "Restorantet më të preferuara"),
            G(map, "cms.landing.restaurants_subtitle", "Restorantet më të vlerësuara nga klientët tanë."),
            G(map, "cms.landing.restaurants_cta_label", "Shiko të gjitha"),
            G(map, "cms.landing.categories_title", "Kategoritë"),
            G(map, "cms.landing.categories_subtitle", "Gjej ushqimin që të pëlqen."),
            G(map, "cms.landing.testimonials_title", "Çfarë thonë klientët"),
            G(map, "cms.landing.testimonial_1_name", "Arben K."),
            G(map, "cms.landing.testimonial_1_quote", "Dorëzim super i shpejtë dhe ushqim i freskët!"),
            G(map, "cms.landing.testimonial_2_name", "Elira M."),
            G(map, "cms.landing.testimonial_2_quote", "Platforma më e lehtë për të porositur online."),
            G(map, "cms.landing.testimonial_3_name", "Driton H."),
            G(map, "cms.landing.testimonial_3_quote", "Restorante të shumta dhe çmime të mira."),
            G(map, "cms.landing.footer_tagline", "Ushqim i shpejtë, në derën tënde."),
            G(map, "cms.landing.footer_copyright", "© 2026 FoodDelivery. Të gjitha të drejtat e rezervuara."),
            G(map, "cms.landing.footer_link_restaurants", "Restorantet"),
            G(map, "cms.landing.footer_link_categories", "Kategoritë"),
            G(map, "cms.landing.footer_link_partner", "Bëhu partner"),
            G(map, "cms.landing.partner_eyebrow", "Për restorante & biznese"),
            G(map, "cms.landing.partner_title", "Bëhu partner me ne"),
            G(
                map,
                "cms.landing.partner_body",
                "Nëse dëshiron të listosh menunë dhe të marrësh porosi përmes platformës, apliko fillimisht këtu."));
    }
}
