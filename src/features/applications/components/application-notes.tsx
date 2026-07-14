"use client";

import { useEffect, useState } from "react";
import { CalendarClock, LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Note = {
  id: string;
  content: string;
  follow_up_at: string | null;
  created_at: string;
};

export function ApplicationNotes({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/applications/${applicationId}/notes`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { notes?: Note[] }) => setNotes(payload.notes ?? []));
  }, [applicationId]);

  async function addNote() {
    if (!content.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/applications/${applicationId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { note?: Note } | null;
    if (response.ok && payload?.note) {
      setNotes((current) => [payload.note!, ...current]);
      setContent("");
      setFollowUpAt("");
    }
    setSaving(false);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-5 text-primary" />
        <h2 className="font-heading text-xl font-semibold">Notes and follow-up</h2>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="application-note">Note</Label>
          <Textarea
            id="application-note"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Interview feedback, recruiter contact, or next action"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="follow-up-at">Follow-up date</Label>
          <Input
            id="follow-up-at"
            type="datetime-local"
            value={followUpAt}
            onChange={(event) => setFollowUpAt(event.target.value)}
          />
        </div>
        <Button disabled={!content.trim() || saving} onClick={() => void addNote()}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add note
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm leading-6">{note.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Added {new Date(note.created_at).toLocaleString()}
              {note.follow_up_at ? ` · Follow up ${new Date(note.follow_up_at).toLocaleString()}` : ""}
            </p>
          </div>
        ))}
        {!notes.length && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </div>
    </Card>
  );
}
