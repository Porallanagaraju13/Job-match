import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/server/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid resume ID." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ status: "review_required", mode: "demo" });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view resume status." }, { status: 401 });

  const { data: resume, error } = await supabase
    .from("resumes")
    .select("status, updated_at, processing_error")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  return NextResponse.json({
    status: resume.status,
    updatedAt: resume.updated_at,
    error: resume.processing_error,
  });
}
