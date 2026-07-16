import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SecurityClient } from "./SecurityClient";

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  return <SecurityClient />;
}
