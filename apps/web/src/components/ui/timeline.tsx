interface TimelineItem {
  id: number;
  teacher_name: string;
  created_at: string;
  content: string;
  files?: string[];
}

export function Timeline({
  items,
  emptyText = '暂无记录',
}: {
  items: TimelineItem[];
  emptyText?: string;
}) {
  if (items.length === 0) return <p className="text-sm text-slate-400 py-4">{emptyText}</p>;
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id || i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-medium shrink-0">
              {item.teacher_name?.[0] || '👤'}
            </div>
            {i < items.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-700">{item.teacher_name}</span>
              <span className="text-xs text-slate-400">
                {new Date(item.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
