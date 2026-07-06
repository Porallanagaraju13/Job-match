import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { marketingNav } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="JobMatch home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/sign-in" />}
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />} size="sm" className="gap-1.5 px-4">
            Get started
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}

