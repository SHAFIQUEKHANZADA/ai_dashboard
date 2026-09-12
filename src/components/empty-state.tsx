export function EmptyState({ label = "Awaiting data" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/10 text-muted">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 4-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="text-xs text-muted/70">No source feeding this yet</p>
    </div>
  );
}
