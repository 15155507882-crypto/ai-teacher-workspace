'use client';
import { Button } from './button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-[#7587ad]">
        共 {total} 条，第 {page}/{totalPages} 页
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          上一页
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
