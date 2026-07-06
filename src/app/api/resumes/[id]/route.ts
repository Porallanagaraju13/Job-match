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
  if (!supabase) return NextResponse.json({ error: "Resume storage is not connected." }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download a resume." }, { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(resume.storage_path, 60, { download: true });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Download link could not be created." }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid resume ID." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ mode: "demo", deleted: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to delete a resume." }, { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("storage_path, is_active")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const { error: deleteError } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  await supabase.storage.from("resumes").remove([resume.storage_path]);
  if (resume.is_active) {
    const { data: replacement } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (replacement) {
      await supabase.from("resumes").update({ is_active: true }).eq("id", replacement.id);
    }
  }
  return NextResponse.json({ deleted: true });
}
