import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="max-w-md text-center">
        <BrandMark className="justify-center" />
        <SearchX className="mx-auto mt-12 size-10 text-muted-foreground" />
        <h1 className="mt-5 font-heading text-3xl font-semibold">We could not find that page</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          The role may have closed, or the link may no longer be available.
        </p>
        <Button render={<Link href="/app/jobs" />} className="mt-7">
          <ArrowLeft className="size-4" />
          Back to job matches
        </Button>
      </div>
    </main>
  );
}
