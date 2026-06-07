import type { CmsSectionDef } from '../../lib/cmsConfig'
import { CmsFieldEditor } from './CmsFieldEditor'

type Props = {
  section: CmsSectionDef
  draft: Record<string, string>
  onFieldChange: (key: string, value: string) => void
}

export function CmsSectionEditor({ section, draft, onFieldChange }: Props) {
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
