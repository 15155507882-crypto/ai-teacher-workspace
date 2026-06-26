'use client';
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/top-nav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { Timeline } from '@/components/ui/timeline';
import { FilterBar } from '@/components/ui/filter-bar';

export default function ReflectionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('2026-2027学年上学期');
  const [detail, setDetail] = useState<any>(null);
  const tk = () => localStorage.getItem('accessToken') || '';

  useEffect(() => {
    fetch('/api/teachers/1/contents?content_type=reflection&size=500', {
      headers: { Authorization: `Bearer ${tk()}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 0) setItems(j.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) =>
    search ? i.title?.includes(search) || i.summary?.includes(search) : true
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-4">教学反思</h1>
        <FilterBar>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option>2026-2027学年上学期</option>
            <option>2025-2026学年下学期</option>
          </select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索课程名或反思内容..."
            className="w-56"
          />
        </FilterBar>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-left w-12">序号</th>
                  <th className="p-3 text-left">教师</th>
                  <th className="p-3 text-left">学年学期</th>
                  <th className="p-3 text-left">课程名称</th>
                  <th className="p-3 text-left">创建时间</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 text-xs text-slate-500">教师</td>
                    <td className="p-3 text-xs text-slate-500">{item.academic_year || semester}</td>
                    <td className="p-3 font-medium text-slate-700">{item.title} 的教学反思</td>
                    <td className="p-3 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const r = await fetch(`/api/contents/${item.id}`, {
                            headers: { Authorization: `Bearer ${tk()}` },
                          });
                          const j = await r.json();
                          setDetail(j.code === 0 ? j.data : item);
                        }}
                      >
                        查看
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-400">暂无教学反思</div>
            )}
          </div>
        )}
        <Drawer open={!!detail} onClose={() => setDetail(null)} title="教学反思详情">
          {detail && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">{detail.academic_year || semester}</p>
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {detail.title} 的教学反思
                </h3>
              </div>
              {detail.summary && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-1">摘要</h4>
                  <p className="text-sm text-slate-600">{detail.summary}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  下载
                </Button>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-600 mb-3">反思记录</h4>
                <Timeline items={[]} emptyText="暂无反思记录" />
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </div>
  );
}
