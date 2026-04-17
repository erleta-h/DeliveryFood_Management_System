/** Foto Unsplash (crop) për kategori — për pamje të ngjashme me Wolt. */

const DEFAULT =
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=280&h=280&fit=crop&q=80'

const PATTERNS: { test: RegExp; url: string }[] = [
  {
    test: /pizza/i,
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /burger|grill/i,
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /sushi|aziatik|asian|wok|bamboo/i,
    url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /kafe|coffee|mëngjes|breakfast|croissant/i,
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /pije|drink|juice/i,
    url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /pasta|italian/i,
    url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /chicken|pulë|fried/i,
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=280&h=280&fit=crop&q=80',
  },
  {
    test: /sandwich|toast/i,
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=280&h=280&fit=crop&q=80',
  },
]

export function imageUrlForFoodCategory(name: string): string {
  for (const p of PATTERNS) {
    if (p.test.test(name)) return p.url
  }
  return DEFAULT
}

/** Për “Të gjitha” — kolazh i përzier. */
export const CATEGORY_ALL_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=280&h=280&fit=crop&q=80'
