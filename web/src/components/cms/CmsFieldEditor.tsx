import type { CmsFieldDef } from '../../lib/cmsConfig'
import { customerField, customerLabelForm } from '../../lib/adminTheme'

type Props = {
  field: CmsFieldDef
  value: string
  onChange: (value: string) => void
}

export function CmsFieldEditor({ field, value, onChange }: Props) {
  const type = field.type ?? 'text'
  const len = value.length
  const max = field.maxLength

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={field.key} className={customerLabelForm}>
          {field.label}
        </label>
        {max ? (
          <span className={`shrink-0 text-xs tabular-nums ${len > max ? 'text-red-500' : 'text-gray-400'}`}>
            {len} / {max}
          </span>
        ) : null}
      </div>
      {field.hint ? <p className="text-xs leading-relaxed text-gray-500">{field.hint}</p> : null}

      {type === 'textarea' ? (
        <textarea
          id={field.key}
          value={value}
          rows={field.rows ?? 3}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          className={`${customerField} resize-y`}
        />
      ) : type === 'image' ? (
        <div className="space-y-3">
          {value ? (
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
              <img
                src={value}
                alt=""
                className="h-16 w-24 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-gray-600">{value.split('/').pop() ?? value}</p>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Hiq
                </button>
              </div>
            </div>
          ) : null}
          <input
            id={field.key}
            type="url"
            value={value}
            placeholder="https://example.com/hero-bg.jpg"
            onChange={(e) => onChange(e.target.value)}
            className={customerField}
          />
        </div>
      ) : (
        <input
          id={field.key}
          type="text"
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          className={customerField}
        />
      )}
    </div>
  )
}
