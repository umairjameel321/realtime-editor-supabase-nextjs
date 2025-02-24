// app/documents/[id]/page.tsx

import { createClient } from "@/utils/supabase/server";
import DocumentEditor from "@/components/DocumentEditor";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-4">Please log in to access this document.</p>;
  }

  return (
    <div className="min-h-screen pt-12">
      <DocumentEditor id={id} />
    </div>
  );
}
