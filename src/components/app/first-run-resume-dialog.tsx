"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const allowedExtensions = [".pdf", ".doc", ".docx"];
const maxSize = 5 * 1024 * 1024;

export function FirstRunResumeDialog({ open }: { open: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("jobmatch.demo-resume-ready") === "true",
  );

  async function upload(file: File) {
    setError(null);
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(extension)) {
      setError("Choose a PDF, DOC, or DOCX resume.");
      return;
    }
    if (file.size > maxSize) {
      setError("Resume files must be 5 MB or smaller.");
      return;
    }

    setFileName(file.name);
    setProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/resumes", { method: "POST", body: formData });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "The resume could not be processed.");
      setProcessing(false);
      return;
    }

    const payload = (await response.json().catch(() => null)) as { mode?: string } | null;
    if (payload?.mode === "demo") {
      window.localStorage.setItem("jobmatch.demo-resume-ready", "true");
      setDismissed(true);
    }
    window.setTimeout(() => {
      router.push("/app/profile");
      router.refresh();
    }, 650);
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(file);
  }

  return (
    <Dialog open={open && !dismissed}>
      <DialogContent
        className="max-w-[620px] gap-0 rounded-2xl p-8"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Welcome to JobMatch</DialogTitle>
          <DialogDescription className="mt-1 text-base leading-6">
            Upload your resume to get started. We&apos;ll extract your profile details automatically
            so you can begin applying to jobs right away.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={selectFile}
        />

        <div className="mt-7 grid min-h-64 place-items-center rounded-xl border-2 border-dashed border-primary/55 bg-primary/[0.025] p-8 text-center">
          {processing ? (
            <div>
              <LoaderCircle className="mx-auto size-11 animate-spin" />
              <p className="mt-5 text-lg font-semibold">Parsing resume...</p>
              <p className="mt-2 max-w-sm truncate text-sm text-muted-foreground">{fileName}</p>
            </div>
          ) : (
            <div>
              <UploadCloud className="mx-auto size-12" strokeWidth={1.6} />
              <p className="mt-5 text-lg font-semibold">Drop your resume here</p>
              <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, up to 5 MB</p>
              <Button
                variant="outline"
                className="mt-5 bg-white"
                onClick={() => inputRef.current?.click()}
              >
                <FileUp className="size-4" />
                Choose file
              </Button>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
