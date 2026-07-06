import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

type LegalSection = {
  title: string;
  content: string;
};

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/">
            <BrandMark />
          </Link>
          <Button render={<Link href="/" />} variant="ghost">
            <ArrowLeft className="size-4" />
            Back home
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="text-sm font-semibold text-primary">Last updated July 3, 2026</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{description}</p>
        <div className="mt-12 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading text-xl font-bold">{section.title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{section.content}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
