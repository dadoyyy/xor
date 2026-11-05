import { requireRoom } from "@/lib/auth";
import NewDeckForm from "./NewDeckForm";
import NoMaterials from "@/components/NoMaterials";

export const metadata = { title: "New flashcards" };

export default async function NewDeck({ params }: { params: Promise<{ id: string }> }) {
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
  return <NewDeckForm roomId={id} materials={materials} />;
}
