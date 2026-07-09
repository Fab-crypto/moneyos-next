import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.auth.getSession();

  return NextResponse.json({
    connected: !error,
    hasSession: !!data.session,
    error: error?.message ?? null,
  });
}