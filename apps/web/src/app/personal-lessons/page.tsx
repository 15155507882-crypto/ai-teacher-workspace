'use client';
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/top-nav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { LessonDetailPanel } from '@/components/lesson-detail-panel';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';

export default function PersonalLessonsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const getCurrentTerm = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const ay = month >= 8 ? `${year}-${year + 1}学年` : `${year - 1}-${year}学年`;
    const sem = month >= 2 && month <= 7 ? '下学期' : '上学期';
    return ay + sem;
  };
  // 计算前后学期供下拉选项
  const semesterOptions = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const m = now.getMonth() + 1;
    const currentAy = m >= 8 ? `${year}-${year + 1}学年` : `${year - 1}-${year}学年`;
    const currentSem = m >= 2 && m <= 7 ? '下学期' : '上学期';
    const prevTerm = currentAy + (currentSem === '下学期' ? '上学期' : '下学期');
    const nextAy =
      currentSem === '下学期' ? `${year}-${year + 1}学年` : `${year + 1}-${year + 2}学年`;
    const nextTerm = nextAy + (currentSem === '下学期' ? '上学期' : '下学期');
    return [currentAy + currentSem, prevTerm, nextTerm];
  })();
  const [semester, setSemester] = useState(semesterOptions[0]);
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
            `/api/teachers/${t.id}/contents?content_type=personal_lesson&size=200`,
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

  const filtered = items.filter((i) => {
    if (search && !(i.title?.includes(search) || i.teacher_name?.includes(search))) return false;
    if (semester) {
      const itemTerm = (i.academic_year || '') + (i.semester || '');
      if (itemTerm !== semester) return false;
    }
    return true;
  });

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
        <h1 className="text-2xl font-bold text-slate-800 mb-4">个人备课</h1>
        <FilterBar>
          <select
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              resetPage();
            }}
            className="rounded-lg border px-3 py-2 text-base"
          >
            <option value="">全部学期</option>
            {semesterOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option>2025-2026学年下学期</option>
          </select>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="搜索课程名或教师..."
            className="w-56"
          />
          <Button
            size="default"
            onClick={() => {
              setPage(1);
            }}
          >
            搜索
          </Button>
        </FilterBar>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-base">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="p-3 text-left w-14">序号</th>
                  <th className="p-3 text-left">备课内容</th>
                  <th className="p-3 text-left">学年学期</th>
                  <th className="p-3 text-left">教师</th>
                  <th className="p-3 text-left">创建时间</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * pageSize, page * pageSize).map((item, i) => (
                  <tr key={item.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="p-3 font-medium text-base text-slate-700">{item.title}</td>
                    <td className="p-3 text-sm text-slate-500">
                      {item.academic_year || '2026-2027学年'} {item.semester || '上学期'}
                    </td>
                    <td className="p-3 text-sm text-slate-500">{item.teacher_name}</td>
                    <td className="p-3 text-sm text-slate-400">
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
              <div className="p-12 text-center text-slate-400">暂无个人备课</div>
            )}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
        <Drawer open={!!detail} onClose={() => setDetail(null)} title="个人备课详情">
          {detail && (
            <LessonDetailPanel
              contentId={detail.id}
              token={tk()}
              teacher={currentUser}
              onClose={() => setDetail(null)}
            />
          )}
        </Drawer>
      </div>
    </div>
  );
}
