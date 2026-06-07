import { getCmsSection } from '../../lib/cmsConfig'
import { CmsFieldEditor } from './CmsFieldEditor'

type Props = {
  draft: Record<string, string>
  onFieldChange: (key: string, value: string) => void
}

export function CmsHeroEditor({ draft, onFieldChange }: Props) {
  const section = getCmsSection('hero')
  return (
    <div className="space-y-5">
      {section.fields.map((field) => (
        <CmsFieldEditor
          key={field.key}
          field={field}
          value={draft[field.key] ?? ''}
          onChange={(v) => onFieldChange(field.key, v)}
        />
      ))}
    </div>
  )
}
