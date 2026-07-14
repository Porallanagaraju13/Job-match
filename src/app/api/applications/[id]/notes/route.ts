import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

const noteSchema = z.object({
  content: z.string().trim().min(1).max(2_000),
  followUpAt: z.string().datetime().nullable().optional(),
});

async function getContext(id: string) {
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid application ID.", status: 400 } as const;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Application storage is not connected.", status: 503 } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to manage application notes.", status: 401 } as const;
  const { data: application } = await supabase
    .from("applications")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!application) return { error: "Application not found.", status: 404 } as const;
  return { supabase, user };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getContext(id);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const { data, error } = await context.supabase
    .from("application_notes")
    .select("id, content, follow_up_at, completed_at, created_at")
    .eq("application_id", id)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid note is required." }, { status: 400 });
  const context = await getContext(id);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status });
  const { data, error } = await context.supabase
    .from("application_notes")
    .insert({
      user_id: context.user.id,
      application_id: id,
      content: parsed.data.content,
      follow_up_at: parsed.data.followUpAt ?? null,
    })
    .select("id, content, follow_up_at, completed_at, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
