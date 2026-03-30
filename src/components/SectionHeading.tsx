type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.32em] text-black/45">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">{title}</h1>
      <p className="mt-4 text-base leading-7 text-black/65">{description}</p>
    </div>
  );
}
