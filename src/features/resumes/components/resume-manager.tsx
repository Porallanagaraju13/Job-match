"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  LoaderCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ResumeRecord } from "@/server/resumes/repository";

const allowedExtensions = [".pdf", ".doc", ".docx"];
const maxSize = 5 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeManager({ initialResumes }: { initialResumes: ResumeRecord[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState(initialResumes);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/resumes", { method: "POST", body: formData });
    setUploading(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "The resume could not be uploaded.");
      return;
    }
    router.refresh();
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(file);
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  async function deleteResume(id: string) {
    const response = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (response.ok) setResumes((current) => current.filter((resume) => resume.id !== id));
  }

  return (
    <div className="mt-8 space-y-7">
      <Card className="p-7">
        <h2 className="font-heading text-xl font-bold">Upload another resume</h2>
        <p className="mt-1 text-muted-foreground">
          Upload a new version to update your profile data.
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={selectFile}
        />
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropFile}
          className={cn(
            "mt-6 grid min-h-64 place-items-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-primary/45 bg-primary/[0.02]",
          )}
        >
          {uploading ? (
            <div>
              <LoaderCircle className="mx-auto size-11 animate-spin" />
              <p className="mt-5 text-lg font-semibold">Parsing resume...</p>
              <p className="mt-1 text-sm text-muted-foreground">{fileName}</p>
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
                <FileText className="size-4" />
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
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b px-7 py-5">
          <h2 className="font-heading text-xl font-bold">Your resumes</h2>
        </div>
        {resumes.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Your uploaded resume will appear here after processing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/25 text-left">
                <tr>
                  <th className="px-7 py-4 font-semibold">File</th>
                  <th className="px-5 py-4 font-semibold">Uploaded</th>
                  <th className="px-5 py-4 font-semibold">Size</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-7 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((resume) => (
                  <tr key={resume.id} className="border-t">
                    <td className="px-7 py-5">
                      <div className="flex items-center gap-3">
                        <FileText className="size-5 text-red-600" />
                        <span className="font-medium">{resume.name}</span>
                        {resume.active && <Badge variant="outline">Active</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-5 text-muted-foreground" suppressHydrationWarning>
                      {new Date(resume.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-5 text-muted-foreground">
                      {formatBytes(resume.sizeBytes)}
                    </td>
                    <td className="px-5 py-5">
                      <Badge className="border-0 bg-primary text-primary-foreground">
                        {resume.status === "review_required" ? "Parsed" : resume.status}
                      </Badge>
                    </td>
                    <td className="px-7 py-5">
                      <div className="flex justify-end gap-1">
                        <Button
                          render={<a href={`/api/resumes/${resume.id}`} />}
                          variant="ghost"
                          size="icon"
                          aria-label={`Download ${resume.name}`}
                        >
                          <Download className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${resume.name}`}
                          onClick={() => deleteResume(resume.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
