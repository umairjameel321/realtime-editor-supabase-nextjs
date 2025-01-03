import { createClient } from "@/utils/supabase/server";

export default async function PrivatePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <p className="flex min-h-screen flex-col items-center justify-between p-24">
      Hello, {data?.user?.user_metadata?.username}
    </p>
  );
}
