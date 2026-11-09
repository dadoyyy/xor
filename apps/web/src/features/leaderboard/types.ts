export type ResetPoll = {
  id: string;
  expiresAt: string;
  votes: { user_id: string; approve: boolean }[];
};

