export type CmsFieldType = 'text' | 'textarea' | 'image'

export type CmsFieldDef = {
  key: string
  label: string
  hint?: string
  maxLength?: number
  type?: CmsFieldType
  rows?: number
}

export type CmsSectionId =
  | 'hero'
  | 'how-it-works'
  | 'restaurants'
  | 'categories'
  | 'testimonials'
  | 'footer'

export type CmsSectionDef = {
  id: CmsSectionId
  label: string
  description: string
  fields: CmsFieldDef[]
}

export const CMS_SECTIONS: CmsSectionDef[] = [
  {
    id: 'hero',
    label: 'Hero Section',
    description: 'Menaxho tekstet e seksionit kryesor (Hero).',
    fields: [
      { key: 'cms.landing.hero_title', label: 'Titulli kryesor', hint: 'Teksti kryesor i hero — shfaqet i bardhë.', maxLength: 60 },
      {
        key: 'cms.landing.hero_highlight',
        label: 'Teksti i theksuar (gradient)',
        hint: 'Fragmenti me ngjyrë gradient pas titullit.',
        maxLength: 30,
      },
      {
        key: 'cms.landing.hero_subtitle',
        label: 'Nëntitulli',
        hint: 'Paragrafi nën titullin kryesor.',
        maxLength: 160,
        type: 'textarea',
        rows: 3,
      },
      { key: 'cms.landing.hero_cta', label: 'Teksti i butonit', maxLength: 30 },
      {
        key: 'cms.landing.hero_background_image',
        label: 'Figura e sfondit',
        hint: 'URL e imazhit (1920×1080 rekomandohet). Lëre bosh për gradient default.',
        type: 'image',
      },
    ],
  },
  {
    id: 'how-it-works',
    label: 'How It Works',
    description: 'Tre hapat që shfaqen nën hero.',
    fields: [
      { key: 'cms.landing.how_it_works_title', label: 'Titulli i seksionit', maxLength: 40 },
      { key: 'cms.landing.how_it_works_step_1_title', label: 'Hapi 1 — titulli', maxLength: 40 },
      { key: 'cms.landing.how_it_works_step_1_body', label: 'Hapi 1 — përshkrimi', type: 'textarea', rows: 2, maxLength: 80 },
      { key: 'cms.landing.how_it_works_step_2_title', label: 'Hapi 2 — titulli', maxLength: 40 },
      { key: 'cms.landing.how_it_works_step_2_body', label: 'Hapi 2 — përshkrimi', type: 'textarea', rows: 2, maxLength: 80 },
      { key: 'cms.landing.how_it_works_step_3_title', label: 'Hapi 3 — titulli', maxLength: 40 },
      { key: 'cms.landing.how_it_works_step_3_body', label: 'Hapi 3 — përshkrimi', type: 'textarea', rows: 2, maxLength: 80 },
    ],
  },
  {
    id: 'restaurants',
    label: 'Restorantet',
    description: 'Tekstet e seksionit restorante (të dhënat vijnë nga sistemi).',
    fields: [
      { key: 'cms.landing.restaurants_title', label: 'Titulli', maxLength: 60 },
      { key: 'cms.landing.restaurants_subtitle', label: 'Nëntitulli', type: 'textarea', rows: 2, maxLength: 120 },
      { key: 'cms.landing.restaurants_cta_label', label: 'Teksti i linkut "Shiko të gjitha"', maxLength: 30 },
    ],
  },
  {
    id: 'categories',
    label: 'Kategoritë',
    description: 'Tekstet e seksionit kategoritë.',
    fields: [
      { key: 'cms.landing.categories_title', label: 'Titulli', maxLength: 40 },
      { key: 'cms.landing.categories_subtitle', label: 'Nëntitulli', type: 'textarea', rows: 2, maxLength: 120 },
    ],
  },
  {
    id: 'testimonials',
    label: 'Testimonialet',
    description: 'Vlerësimet e klientëve në landing page.',
    fields: [
      { key: 'cms.landing.testimonials_title', label: 'Titulli i seksionit', maxLength: 50 },
      { key: 'cms.landing.testimonial_1_name', label: 'Testimonial 1 — emri', maxLength: 40 },
      { key: 'cms.landing.testimonial_1_quote', label: 'Testimonial 1 — citimi', type: 'textarea', rows: 2, maxLength: 160 },
      { key: 'cms.landing.testimonial_2_name', label: 'Testimonial 2 — emri', maxLength: 40 },
      { key: 'cms.landing.testimonial_2_quote', label: 'Testimonial 2 — citimi', type: 'textarea', rows: 2, maxLength: 160 },
      { key: 'cms.landing.testimonial_3_name', label: 'Testimonial 3 — emri', maxLength: 40 },
      { key: 'cms.landing.testimonial_3_quote', label: 'Testimonial 3 — citimi', type: 'textarea', rows: 2, maxLength: 160 },
    ],
  },
  {
    id: 'footer',
    label: 'Footer',
    description: 'Fundi i faqes dhe linket e navigimit.',
    fields: [
      { key: 'cms.landing.footer_tagline', label: 'Tagline', maxLength: 80 },
      { key: 'cms.landing.footer_copyright', label: 'Copyright', maxLength: 120 },
      { key: 'cms.landing.footer_link_restaurants', label: 'Link — Restorantet', maxLength: 30 },
      { key: 'cms.landing.footer_link_categories', label: 'Link — Kategoritë', maxLength: 30 },
      { key: 'cms.landing.footer_link_partner', label: 'Link — Partner', maxLength: 30 },
      { key: 'cms.landing.partner_eyebrow', label: 'Partner — etiketa', maxLength: 40 },
      { key: 'cms.landing.partner_title', label: 'Partner — titulli', maxLength: 60 },
      { key: 'cms.landing.partner_body', label: 'Partner — përshkrimi', type: 'textarea', rows: 3, maxLength: 300 },
    ],
  },
]

export const ALL_CMS_FIELD_KEYS = CMS_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))

export function getCmsSection(id: CmsSectionId): CmsSectionDef {
  const section = CMS_SECTIONS.find((s) => s.id === id)
  if (!section) throw new Error(`Unknown CMS section: ${id}`)
  return section
}
