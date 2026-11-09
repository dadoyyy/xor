import type { CoverDefinition } from "../subjects/covers";

export type Cover = CoverDefinition;

export type RoomSummary = {
  id: string;
  name: string;
  description: string | null;
  cover: string | null;
  role: string;
  owner_id?: string;
};
