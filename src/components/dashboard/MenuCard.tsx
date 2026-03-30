import Link from "next/link";
import { cloneElement, ReactElement, ReactNode } from "react";

interface MenuCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
}

export function MenuCard({ title, description, icon, href }: MenuCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-[#b08d57]/30 p-10 text-center transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_45px_90px_rgba(42,36,33,0.18)] shadow-sm active:scale-[0.98]"
      style={{
        background: "linear-gradient(145deg, #ffffff 0%, #fdfcf9 45%, #f9f6f2 100%)",
        boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 1), 0 8px 30px rgba(166, 155, 143, 0.06)"
      }}
    >
      {/* Light glow on hover/focus */}
      <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-500 group-hover:opacity-40 group-focus:opacity-40" />
      
      {/* Premium metallic glaze effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      {/* Inner glow - more intense on hover */}
      <div className="absolute -inset-24 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_70%)] opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-110" />

      <div className="relative mb-8 flex h-24 w-24 items-center justify-center text-[#9c7b4a] transition-all duration-700 group-hover:scale-110 group-hover:text-[#4a3a29] group-hover:drop-shadow-[0_0_15px_rgba(176,141,87,0.3)]">
        {cloneElement(icon as ReactElement, { className: "h-14 w-14", strokeWidth: 2.2 })}
      </div>

      <h3 className="relative mb-3 font-serif text-3xl uppercase tracking-[0.25em] text-[#5c4a33] transition-colors duration-500 group-hover:text-[#2a2421]">
        {title}
      </h3>
      
      <div className="relative h-[2px] w-14 bg-[#b08d57]/40 mb-5 mx-auto transition-all duration-500 group-hover:w-24 group-hover:bg-[#b08d57]/80" />

      <p className="relative max-w-[220px] text-[13px] font-bold leading-relaxed tracking-wide text-[#7a6a58] transition-colors duration-500 group-hover:text-[#4a3a29]">
        {description}
      </p>

      {/* Dynamic light sweep */}
      <div className="absolute -inset-[100%] z-0 pointer-events-none bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-30deg] transition-all duration-[1200ms] ease-out translate-x-[-150%] group-hover:translate-x-[150%]" />
    </Link>
  );
}
