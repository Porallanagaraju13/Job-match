"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  UploadCloud,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const allowedExtensions = [".pdf", ".doc", ".docx"];
const maxSize = 8 * 1024 * 1024;

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Uploading securely");

  function chooseFile(nextFile: File | undefined) {
    setError(null);
    if (!nextFile) return;
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(extension)) {
      setError("Upload a PDF, DOC, or DOCX resume.");
      return;
    }
    if (nextFile.size > maxSize) {
      setError("Resume files must be smaller than 8 MB.");
      return;
    }
    setFile(nextFile);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function processResume() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(18);
    setStage("Uploading securely");
    const formData = new FormData();
    formData.append("file", file);

    const progressTimer = window.setInterval(() => {
      setProgress((value) => Math.min(value + 9, 82));
    }, 250);

    try {
      const response = await fetch("/api/resumes", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; status?: string; error?: string }
        | null;
      if (!response.ok) throw new Error(payload?.error ?? "Upload could not be completed.");
      setProgress(86);
      setStage(payload?.status === "processing" ? "Enhancing extracted sections" : "Preparing review");

      if (payload?.status === "processing" && payload.id) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 750));
          const statusResponse = await fetch(`/api/resumes/${payload.id}/status`, { cache: "no-store" });
          const statusPayload = (await statusResponse.json().catch(() => null)) as { status?: string } | null;
          setProgress(Math.min(88 + attempt, 98));
          if (statusPayload?.status === "review_required" || statusPayload?.status === "ready") break;
          if (statusPayload?.status === "failed") {
            setError("AI enhancement failed. Your local draft is available for review.");
            break;
          }
        }
      }

      setStage("Profile draft ready");
      setProgress(100);
      window.setTimeout(() => router.push("/onboarding/review"), 250);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload could not be completed.");
      setUploading(false);
    } finally {
      window.clearInterval(progressTimer);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Step 1 of 3</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.035em]">Start with your resume</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
          JobMatch extracts a draft profile. You review and correct it before matching begins.
        </p>
      </div>

      <Card className="mt-8 p-6">
        {!file ? (
          <div
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={cn(
              "rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors",
              dragging ? "border-emerald-300 bg-emerald-50/70" : "border-border bg-muted/20",
            )}
          >
            <span className="mx-auto grid size-14 place-items-center rounded-lg bg-secondary text-primary">
              <UploadCloud className="size-7" />
            </span>
            <p className="mt-5 font-heading text-xl font-bold">Drop your resume here</p>
            <p className="mt-2 text-sm text-muted-foreground">PDF, DOC, or DOCX · up to 8 MB</p>
            <input
              id="resume-file-input"
              name="resumeFile"
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleInput}
            />
            <Button variant="outline" className="mt-6 bg-card" onClick={() => inputRef.current?.click()}>
              Choose a file
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 rounded-lg border bg-muted/25 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-red-100 text-red-700">
                <FileText className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)} · Ready to process</p>
              </div>
              {!uploading && (
                <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
                  <X className="size-4" />
                </Button>
              )}
            </div>
            {uploading && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {progress === 100 ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <LoaderCircle className="size-4 animate-spin text-primary" />
                    )}
                    {progress === 100 ? "Profile draft ready" : stage}
                  </span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="mt-3 h-2" />
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          size="lg"
          className="mt-6 h-11 w-full"
          disabled={!file || uploading}
          onClick={processResume}
        >
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {uploading ? stage : "Upload & create profile"}
          {!uploading && <ArrowRight className="size-4" />}
        </Button>

        <div className="mt-5 flex items-start gap-2 border-t pt-5 text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
          Your resume is stored privately and is never published. You can replace or delete it later.
        </div>
      </Card>
    </div>
  );
}
