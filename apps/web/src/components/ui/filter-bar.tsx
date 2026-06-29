interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
      {children}
    </div>
  );
}
