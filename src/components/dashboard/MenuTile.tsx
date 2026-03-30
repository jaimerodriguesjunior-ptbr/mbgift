import type { ReactNode } from "react";

import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

type MenuTileProps = {
  title: string;
  href: string;
  icon: ReactNode;
  stats: string;
};

export function MenuTile({ title, href, icon, stats }: MenuTileProps) {
  return (
    <article className="surface-card group p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(166,155,143,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white/55 bg-white/42 text-ink backdrop-blur-md">
          {icon}
        </div>
        <span className="rounded-full border border-white/55 bg-white/42 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-black/55 backdrop-blur-md">
          {stats}
        </span>
      </div>
      <h2 className="mt-10 font-serif text-[2.2rem] leading-none text-ink">{title}</h2>
      <div className="mt-10">
        <Button href={href} size="lg" className="w-full gap-2">
          Acessar
          <ArrowRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
