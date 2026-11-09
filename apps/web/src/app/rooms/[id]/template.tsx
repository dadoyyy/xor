// Re-mounts on every room tab change, so each tab fades in softly.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}

