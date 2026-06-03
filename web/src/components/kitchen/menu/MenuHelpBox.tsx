export function MenuHelpBox() {
  return (
    <div className="flex gap-3 rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-3.5 ring-1 ring-[#21262d]">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-300"
        aria-hidden
      >
        i
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">Si funksionon?</p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
          Krijo seksionet e menusë (p.sh. Pizza, Pije) dhe pastaj shto artikujt përkatës brenda secilit seksion.
          «Në ofertë» = klienti e sheh në menu; «Preferuar» = shfaqet vetëm te skeda «Të preferuarat» kur e aktivizon
          restoranti (artikujt e rinj nuk shkojnë atje vetvetiu).
        </p>
      </div>
    </div>
  )
}
