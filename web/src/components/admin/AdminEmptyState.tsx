import type { ReactNode } from 'react'

import { Link } from 'react-router-dom'

import { customerBtnGhost } from '../../lib/adminTheme'



type Props = {

  icon: string

  title: string

  description: string

  action?: { label: string; to: string }

  children?: ReactNode

}



export function AdminEmptyState({ icon, title, description, action, children }: Props) {

  return (

    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">

      <span className="text-5xl" aria-hidden>

        {icon}

      </span>

      <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>

      <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>

      {children}

      {action ? (

        <Link to={action.to} className={`${customerBtnGhost} mt-6`}>

          {action.label}

        </Link>

      ) : null}

    </div>

  )

}


