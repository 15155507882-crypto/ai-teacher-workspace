import { Input } from './input';
import { Button } from './button';

interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-200">
      {children}
    </div>
  );
}
