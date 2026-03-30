type BadgeProps = {
  children: string;
  tone?: "default" | "low-stock" | "disponivel" | "reservado" | "comprado";
};

const toneStyles = {
  default: "bg-white text-ink ring-1 ring-black/10",
  "low-stock": "bg-[#f7e3d1] text-[#8c4a15]",
  disponivel: "bg-[#eef4ec] text-[#466244]",
  reservado: "bg-[#fbefcf] text-[#89651d]",
  comprado: "bg-[#efe7ea] text-[#6f5060]"
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${toneStyles[tone]}`}
    >
      {children}
    </span>
  );
}
