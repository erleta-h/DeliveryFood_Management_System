import { Link } from 'react-router-dom'

const linkClass = 'font-medium text-[#FF7A18] hover:underline'

export function PaymentLegalFooter() {
  return (
    <p className="text-center text-xs leading-relaxed text-zinc-500">
      Duke vazhduar, pranon{' '}
      <Link to="/app/support" className={linkClass}>
        Termat dhe Kushtet
      </Link>{' '}
      dhe{' '}
      <Link to="/app/support" className={linkClass}>
        Politikën e Privatësisë
      </Link>
      .
    </p>
  )
}
