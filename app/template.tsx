// Re-mounts when moving between top-level pages (home, login, rooms...).
// Opacity only, so sticky headers and drawers keep their positions while it plays.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}
