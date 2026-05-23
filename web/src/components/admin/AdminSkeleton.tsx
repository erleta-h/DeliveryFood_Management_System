export function AdminStatCardsSkeleton({ count = 4 }: { count?: number }) {

  return (

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

      {Array.from({ length: count }, (_, i) => (

        <div

          key={i}

          className="h-[108px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100"

        />

      ))}

    </div>

  )

}



export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {

  return (

    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

      <div className="h-10 animate-pulse border-b border-gray-200 bg-gray-50" />

      {Array.from({ length: rows }, (_, i) => (

        <div key={i} className="h-14 animate-pulse border-b border-gray-100 bg-white" />

      ))}

    </div>

  )

}


