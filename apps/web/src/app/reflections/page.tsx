'use client';
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/top-nav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { Timeline } from '@/components/ui/timeline';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';

export default function ReflectionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('2026-2027学年上学期');
  const [detail, setDetail] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const tk = () => localStorage.getItem('accessToken') || '';
  const [currentUser, setCurrentUser] = useState<any>(null);
  const resetPage = () => setPage(1);
  const canDelete = (item: any) =>
    currentUser?.role === 'admin' || item.teacher_id === currentUser?.id;

  useEffect(() => {
    setCurrentUser(JSON.parse(localStorage.getItem('teacher') || 'null'));
    (async () => {
      const tRes = await fetch('/api/home/teachers?school_id=1', {
        headers: { Authorization: `Bearer ${tk()}` },
      }).then((r) => r.json());
      const allTeachers = tRes.data?.items || [];
      const all: any[] = [];
      for (const t of allTeachers) {
        try {
          const cRes = await fetch(
            `/api/teachers/${t.id}/contents?content_type=reflection&size=200`,
            { headers: { Authorization: `Bearer ${tk()}` } }
          ).then((r) => r.json());
          if (cRes.code === 0 && cRes.data?.items)
            cRes.data.items.forEach((c: any) => {
              c.teacher_name = t.name;
              all.push(c);
            });
        } catch {}
      }
      setItems(all);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter((i) =>
    search ? i.title?.includes(search) || i.teacher_name?.includes(search) : true
  );

  const handleDelete = async (item: any) => {
    if (!confirm('确认删除？')) return;
    const r = await fetch(`/api/contents/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '手动删除' }),
    });
    const j = await r.json();
    if (j.code === 0) setItems(items.filter((i) => i.id !== item.id));
    else alert(j.message || '删除失败');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-4">教学反思</h1>
        <FilterBar>
          <select
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              resetPage();
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">全部学期</option>
            <option>2026-2027学年上学期</option>
            <option>2025-2026学年下学期</option>
          </select>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="搜索课程名或反思内容..."
            className="w-56"
          />
        </FilterBar>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3 text-left">课程名称</th>
                  <th className="p-3 text-left">学年学期</th>
                  <th className="p-3 text-left">教师</th>
                  <th className="p-3 text-left">创建时间</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((item, i) => (
                  <tr key={item.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-700">{item.title} 的教学反思</td>
                    <td className="p-3 text-xs text-slate-500">
                      {item.academic_year || '2026-2027学年上学期'}
                    </td>
                    <td className="p-3 text-xs text-slate-500">{item.teacher_name}</td>
                    <td className="p-3 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="p-3 text-right space-x-1">
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
                      {canDelete(item) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleDelete(item)}
                        >
                          删除
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <div className="p-12 text-center text-slate-400">暂无教学反思</div>
            )}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
        <Drawer open={!!detail} onClose={() => setDetail(null)} title="教学反思详情">
          {detail && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">{detail.academic_year}</p>
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
              <Timeline items={[]} emptyText="暂无反思记录" />
            </div>
          )}
        </Drawer>
      </div>
    </div>
  );
}
