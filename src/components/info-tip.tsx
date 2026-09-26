import { Info } from "lucide-react";

// A small "i" that reveals a metric's definition on hover (Reid: "a little thing
// you could hover over"). Pure CSS hover (named group) so it works inside cards
// and drill links without client JS.
export function InfoTip({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`group/tip relative inline-flex items-center ${className}`}>
      <Info
        className="h-3.5 w-3.5 shrink-0 cursor-help text-muted/50 transition-colors group-hover/tip:text-muted"
        strokeWidth={2.2}
        aria-label={text}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden w-60 -translate-x-1/2 rounded-lg border border-line bg-surface p-2.5 text-left text-[11px] font-normal normal-case leading-snug text-ink shadow-[0_8px_24px_rgba(0,0,0,0.14)] group-hover/tip:block"
      >
        {text}
      </span>
    </span>
  );
}
