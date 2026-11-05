import { requireRoom } from "@/lib/auth";
import NewQuizForm from "./NewQuizForm";
import NoMaterials from "@/components/NoMaterials";

export const metadata = { title: "New quiz" };

export default async function NewQuiz({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRoom(id);
  const { data } = await supabase
    .from("materials")
    .select("id, title, page_count")
    .eq("room_id", id)
    .eq("status", "ready")
    .order("created_at", { ascending: false });
  const materials = (data ?? []).map((m) => ({ id: m.id, title: m.title, pageCount: m.page_count }));
  if (!materials.length) return <NoMaterials roomId={id} />;
  return <NewQuizForm roomId={id} materials={materials} />;
}
