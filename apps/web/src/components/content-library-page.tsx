'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Eye,
  Lightbulb,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { TopNav } from '@/components/top-nav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { LessonDetailPanel } from '@/components/lesson-detail-panel';
import { FilterBar } from '@/components/ui/filter-bar';
import { Pagination } from '@/components/ui/pagination';

type ContentKind = 'personal_lesson' | 'group_lesson' | 'plan_summary' | 'reflection';

const pageConfig = {
  personal_lesson: {
    title: '个人备课',
    subtitle: '集中查看教师个人备课资料，快速进入详情与评论。',
    placeholder: '搜索课程名或教师...',
    empty: '暂无个人备课',
    detailTitle: '个人备课详情',
    icon: BookOpen,
    accent: 'from-blue-400 to-blue-700',
    badge: 'blue' as const,
  },
  group_lesson: {
    title: '集体备课',
    subtitle: '沉淀教研组共备成果，查看主题、周次与互动记录。',
    placeholder: '搜索备课内容或教师...',
    empty: '暂无集体备课记录',
    detailTitle: '集体备课详情',
    icon: Users,
    accent: 'from-emerald-400 to-blue-600',
    badge: 'green' as const,
  },
  plan_summary: {
    title: '计划与总结',
    subtitle: '按学期归档计划、总结与阶段性工作材料。',
    placeholder: '搜索名称或教师...',
    empty: '暂无计划与总结',
    detailTitle: '计划与总结详情',
    icon: ClipboardList,
    accent: 'from-violet-400 to-blue-600',
    badge: 'purple' as const,
  },
  reflection: {
    title: '教学反思',
    subtitle: '追踪课后反思与改进记录，让教学复盘更清晰。',
    placeholder: '搜索课程名、反思内容或教师...',
    empty: '',
    detailTitle: '教学反思详情',
    icon: Lightbulb,
    accent: 'from-amber-400 to-blue-600',
    badge: 'orange' as const,
  },
};

function getSemesterOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentAy = month >= 8 ? `${year}-${year + 1}学年` : `${year - 1}-${year}学年`;
  const currentSem = month >= 2 && month <= 7 ? '下学期' : '上学期';
  const prevTerm = currentAy + (currentSem === '下学期' ? '上学期' : '下学期');
  const nextAy =
    currentSem === '下学期' ? `${year}-${year + 1}学年` : `${year + 1}-${year + 2}学年`;
  const nextTerm = nextAy + (currentSem === '下学期' ? '上学期' : '下学期');
  return [currentAy + currentSem, prevTerm, nextTerm];
}

function selectClassName() {
  return 'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#30466f] shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100';
}

function formatTerm(item: any) {
  return `${item.academic_year || '2026-2027学年'} ${item.semester || '上学期'}`;
}

function formatTitle(kind: ContentKind, item: any) {
  if (kind === 'reflection') return `${item.title} 的教学反思`;
  if (kind === 'plan_summary') return `${item.academic_year || '2026-2027学年'} ${item.title}`;
  return item.title;
}

export function ContentLibraryPage({ kind }: { kind: ContentKind }) {
  const config = pageConfig[kind];
  const Icon = config.icon;
  const semesterOptions = getSemesterOptions();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState(semesterOptions[0]);
  const [week, setWeek] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const pageSize = 20;
  const tk = () => localStorage.getItem('accessToken') || '';
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
      for (const teacher of allTeachers) {
        try {
          const cRes = await fetch(
            `/api/teachers/${teacher.id}/contents?content_type=${kind}&size=200`,
            { headers: { Authorization: `Bearer ${tk()}` } }
          ).then((r) => r.json());
          if (cRes.code === 0 && cRes.data?.items) {
            cRes.data.items.forEach((content: any) => {
              content.teacher_name = teacher.name;
              all.push(content);
            });
          }
        } catch {}
      }
      setItems(all);
      setLoading(false);
    })();
  }, [kind]);

  const filtered = items.filter((item) => {
    const term = (item.academic_year || '') + (item.semester || '');
    const itemWeek = item.week || item.week_no || item.teaching_week;
    if (search && !(item.title?.includes(search) || item.teacher_name?.includes(search))) {
      return false;
    }
    if (semester && term !== semester) return false;
    if (kind === 'group_lesson' && week && itemWeek && String(itemWeek) !== String(week)) {
      return false;
    }
    return true;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openDetail = async (item: any) => {
    const r = await fetch(`/api/contents/${item.id}`, {
      headers: { Authorization: `Bearer ${tk()}` },
    });
    const j = await r.json();
    setDetail(j.code === 0 ? j.data : item);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const r = await fetch(`/api/contents/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '手动删除' }),
    });
    const j = await r.json();
    if (j.code === 0) {
      setItems(items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      alert(j.message || '删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f9ff_0%,#fbfdff_52%,#f6f9ff_100%)] text-[#10234f]">
      <TopNav />
      <main className="mx-auto max-w-[1656px] px-6 py-9 lg:px-8">
        <section className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${config.accent} text-white shadow-[0_10px_28px_rgba(37,99,235,0.26)]`}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-normal text-[#0f2354]">
                {config.title}
              </h1>
              <p className="mt-2 text-base font-medium text-[#7587ad]">{config.subtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
            <div className="border-r border-slate-100 px-6 py-3">
              <p className="text-xs font-semibold text-[#8292b4]">全部资料</p>
              <p className="mt-1 text-2xl font-extrabold text-[#10234f]">{items.length}</p>
            </div>
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-[#8292b4]">当前结果</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">{filtered.length}</p>
            </div>
          </div>
        </section>

        <FilterBar>
          <select
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              resetPage();
            }}
            className={selectClassName()}
          >
            <option value="">全部学期</option>
            {semesterOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option>2025-2026学年下学期</option>
          </select>
          {kind === 'group_lesson' && (
            <select
              value={week}
              onChange={(e) => {
                setWeek(e.target.value);
                resetPage();
              }}
              className={selectClassName()}
            >
              <option value="">全部周</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((item) => (
                <option key={item} value={item}>
                  第{item}周
                </option>
              ))}
            </select>
          )}
          <div className="relative min-w-[260px] flex-1 lg:max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f86bd]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder={config.placeholder}
              className="h-11 rounded-xl pl-11 text-sm shadow-sm"
            />
          </div>
          <Button size="default" onClick={() => setPage(1)}>
            搜索
          </Button>
        </FilterBar>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="mb-3 h-14 rounded-xl bg-slate-100 last:mb-0 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-base">
                <thead className="bg-[#f7faff] text-sm font-semibold text-[#6e7fa7]">
                  <tr>
                    <th className="w-24 px-5 py-4 text-left">序号</th>
                    <th className="px-5 py-4 text-left">
                      {kind === 'plan_summary'
                        ? '名称'
                        : kind === 'reflection'
                          ? '课程名称'
                          : '备课内容'}
                    </th>
                    {kind === 'group_lesson' && <th className="px-5 py-4 text-left">类型</th>}
                    {kind !== 'plan_summary' && <th className="px-5 py-4 text-left">学年学期</th>}
                    {kind === 'group_lesson' && <th className="px-5 py-4 text-left">周次</th>}
                    {kind !== 'group_lesson' && <th className="px-5 py-4 text-left">教师</th>}
                    <th className="px-5 py-4 text-left">创建时间</th>
                    <th className="px-5 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((item, i) => (
                    <tr key={item.id} className="transition hover:bg-[#f7faff]">
                      <td className="px-5 py-4 text-sm font-medium text-[#8ba0c5]">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="max-w-[520px] px-5 py-4">
                        <button
                          onClick={() => openDetail(item)}
                          className="text-left truncate text-base font-bold text-[#10234f] hover:text-blue-600 transition cursor-pointer max-w-full"
                          title={formatTitle(kind, item)}
                        >
                          {formatTitle(kind, item)}
                        </button>
                      </td>
                      {kind === 'group_lesson' && (
                        <td className="px-5 py-4">
                          <Badge variant={config.badge}>
                            {item.subject || item.group_lesson_type || '集体备课'}
                          </Badge>
                        </td>
                      )}
                      {kind !== 'plan_summary' && (
                        <td className="px-5 py-4 text-sm font-medium text-[#53688f]">
                          {formatTerm(item)}
                        </td>
                      )}
                      {kind === 'group_lesson' && (
                        <td className="px-5 py-4 text-sm font-medium text-[#53688f]">
                          {item.week || item.week_no || item.teaching_week || '—'}
                        </td>
                      )}
                      {kind !== 'group_lesson' && (
                        <td className="px-5 py-4 text-sm font-medium text-[#53688f]">
                          {item.teacher_name}
                        </td>
                      )}
                      <td className="px-5 py-4 text-sm text-[#8ba0c5]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(item.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                            <Eye className="mr-1.5 h-4 w-4" />
                            查看
                          </Button>
                          {canDelete(item) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              删除
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && config.empty && (
              <div className="px-6 py-16 text-center text-base font-medium text-slate-400">
                {config.empty}
              </div>
            )}
          </div>
        )}

        <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
        <Drawer
          open={!!detail}
          onClose={() => setDetail(null)}
          title={config.detailTitle}
          width="max-w-3xl"
        >
          {detail && (
            <LessonDetailPanel
              contentId={detail.id}
              token={tk()}
              teacher={currentUser}
              onClose={() => setDetail(null)}
            />
          )}
        </Drawer>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#10234f]">确认删除资料？</h3>
                <p className="mt-1 text-sm text-[#7587ad]">删除后将无法在列表中恢复。</p>
              </div>
            </div>
            <p className="mb-5 rounded-xl bg-[#f7faff] px-4 py-3 text-sm font-medium text-[#30466f]">
              {formatTitle(kind, deleteTarget)}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
