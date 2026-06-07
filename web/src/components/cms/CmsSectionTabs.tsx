import type { CmsSectionId } from '../../lib/cmsConfig'

type Props = {
  active: CmsSectionId
  onChange: (id: CmsSectionId) => void
}

const TABS: { id: CmsSectionId; label: string }[] = [
  { id: 'hero', label: 'Hero Section' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'restaurants', label: 'Restorantet' },
  { id: 'categories', label: 'Kategoritë' },
  { id: 'testimonials', label: 'Testimonialet' },
  { id: 'footer', label: 'Footer' },
]

export function CmsSectionTabs({ active, onChange }: Props) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-100 pb-px" aria-label="Seksionet CMS">
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'rounded-t-lg px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'border-b-2 border-violet-600 text-violet-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
