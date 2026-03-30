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
      className="group relative flex min-h-[92px] w-full flex-row items-center justify-start overflow-hidden rounded-[1.9rem] border border-[#b08d57]/30 p-4 text-left transition-all duration-500 shadow-sm active:scale-[0.98] hover:-translate-y-3 hover:shadow-[0_45px_90px_rgba(42,36,33,0.18)] sm:min-h-0 sm:w-auto sm:flex-col sm:items-center sm:justify-center sm:rounded-[2.5rem] sm:p-10 sm:text-center"
      style={{
        background: "linear-gradient(145deg, #ffffff 0%, #fdfcf9 45%, #f9f6f2 100%)",
        boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 1), 0 8px 30px rgba(166, 155, 143, 0.06)"
      }}
    >
      <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-500 group-hover:opacity-40 group-focus:opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute -inset-24 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_70%)] opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-110" />

      <div className="relative mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center text-[#9c7b4a] transition-all duration-700 group-hover:scale-110 group-hover:text-[#4a3a29] group-hover:drop-shadow-[0_0_15px_rgba(176,141,87,0.3)] sm:mr-0 sm:mb-8 sm:h-24 sm:w-24">
        {cloneElement(icon as ReactElement, { className: "h-6 w-6 sm:h-14 sm:w-14", strokeWidth: 2.2 })}
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col sm:flex-none">
        <h3 className="relative mb-1 font-serif text-[15px] uppercase tracking-[0.14em] text-[#5c4a33] transition-colors duration-500 group-hover:text-[#2a2421] sm:mb-3 sm:text-3xl sm:tracking-[0.25em]">
          {title}
        </h3>

        <div className="relative mb-2 h-[2px] w-10 bg-[#b08d57]/40 transition-all duration-500 group-hover:bg-[#b08d57]/80 sm:mx-auto sm:mb-5 sm:w-14 sm:group-hover:w-24" />

        <p className="relative text-[11px] font-bold leading-relaxed tracking-wide text-[#7a6a58] transition-colors duration-500 group-hover:text-[#4a3a29] sm:max-w-[220px] sm:text-[13px]">
          {description}
        </p>
      </div>

      <div className="absolute -inset-[100%] z-0 pointer-events-none bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-30deg] transition-all duration-[1200ms] ease-out translate-x-[-150%] group-hover:translate-x-[150%]" />
    </Link>
  );
}
