export default function Loading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-16 bg-card border-b border-border" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="w-full aspect-video rounded-2xl bg-muted" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded-lg bg-muted" />
          <div className="flex gap-3">
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-5 w-24 rounded-full bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted" style={{ width: `${85 - i * 5}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
