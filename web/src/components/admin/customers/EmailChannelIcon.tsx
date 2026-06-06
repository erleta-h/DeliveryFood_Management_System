import { useMemo, useState } from 'react'
import type { CustomerEmailChannel } from '../../../lib/customerEmailLinks'

type IconProps = { className?: string; alt?: string }

/** PNG/SVG zyrtare — Google gstatic & Microsoft Fabric CDN. */
const OFFICIAL_ICON_URLS: Record<CustomerEmailChannel, string[]> = {
  gmail: [
    'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
    '/icons/email/gmail.svg',
  ],
  'outlook-web': [
    'https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/outlook_48x1.png',
    'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
  ],
  'outlook-office': [
    'https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/office_48x1.png',
    'https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg',
  ],
  'local-app': [
    'https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/mail_48x1.png',
    '/icons/email/local-mail.svg',
  ],
}

const ICON_ALT: Record<CustomerEmailChannel, string> = {
  gmail: 'Gmail',
  'outlook-web': 'Outlook',
  'outlook-office': 'Microsoft Office',
  'local-app': 'Mail',
}

function BrandIcon({ channel, className = 'h-12 w-12' }: { channel: CustomerEmailChannel; className?: string }) {
  const sources = useMemo(() => OFFICIAL_ICON_URLS[channel], [channel])
  const [srcIndex, setSrcIndex] = useState(0)
  const src = sources[Math.min(srcIndex, sources.length - 1)]

  return (
    <img
      src={src}
      alt={ICON_ALT[channel]}
      className={`${className} object-contain`}
      draggable={false}
      loading="eager"
      decoding="async"
      onError={() => {
        setSrcIndex((i) => (i < sources.length - 1 ? i + 1 : i))
      }}
    />
  )
}

export function EmailChannelIcon({ channel, className }: { channel: CustomerEmailChannel; className?: string }) {
  return <BrandIcon channel={channel} className={className} />
}

function CopyIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export { CopyIcon }
