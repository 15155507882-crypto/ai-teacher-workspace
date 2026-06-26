'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopNav } from '@/components/top-nav';

// Default avatar styles: 4 male + 4 female variations
const AVATARS = {
  male: [
    'from-blue-500 to-cyan-400', // 蓝天
    'from-indigo-500 to-blue-400', // 深海
    'from-teal-500 to-emerald-400', // 森林
    'from-slate-600 to-slate-400', // 稳重
  ],
  female: [
    'from-pink-400 to-rose-300', // 樱花
    'from-purple-500 to-violet-400', // 紫藤
    'from-orange-400 to-amber-300', // 暖阳
    'from-fuchsia-500 to-pink-400', // 芍药
  ],
};

function DefaultAvatar({
  name,
  gender,
  size = 40,
}: {
  name: string;
  gender?: string | null;
  size?: number;
}) {
  const idx = (name.charCodeAt(0) || 0) % 4;
  const colors = (gender === 'female' ? AVATARS.female : AVATARS.male)[idx];
  return (
    <div
      className={`w-[${size}px] h-[${size}px] rounded-full bg-gradient-to-br ${colors} flex items-center justify-center text-white font-bold text-lg shadow-inner`}
      style={{ width: size, height: size }}
      title={name}
    >
      {name[0]}
    </div>
  );
}

interface Content {
  id: number;
  title: string;
  content_type: string;
  academic_year: string;
  semester: string;
  created_at: string;
  summary?: string;
  teacher_id: number;
}
interface Stats {
  personal_lesson: number;
  reflection: number;
  group_lesson: number;
  plan_summary: number;
  total: number;
}
const typeIcons: Record<string, string> = {
  personal_lesson: '📖',
  reflection: '📝',
  group_lesson: '👥',
  plan_summary: '📋',
};
const typeLabels: Record<string, string> = {
  personal_lesson: '个人备课',
  reflection: '教学反思',
  group_lesson: '集体备课',
  plan_summary: '计划总结',
};

export default function TeacherSpacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [stats, setStats] = useState<Stats>({
    personal_lesson: 0,
    reflection: 0,
    group_lesson: 0,
    plan_summary: 0,
    total: 0,
  });
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [cardMode, setCardMode] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', mobile: '', employee_no: '' });
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const tk = () => localStorage.getItem('accessToken') || '';

  useEffect(() => {
    const u = localStorage.getItem('teacher');
    if (u) setCurrentUser(JSON.parse(u));
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tRes, cRes, sRes] = await Promise.all([
        fetch('/api/home/teachers?school_id=1', {
          headers: { Authorization: 'Bearer ' + tk() },
        }).then((r) => r.json()),
        fetch('/api/teachers/' + id + '/contents?size=500', {
          headers: { Authorization: 'Bearer ' + tk() },
        }).then((r) => r.json()),
        fetch('/api/teachers/' + id + '/content-stats', {
          headers: { Authorization: 'Bearer ' + tk() },
        }).then((r) => r.json()),
      ]);
      if (tRes.code === 0) {
        const f = tRes.data.items?.find((x: any) => x.id === parseInt(id));
        setTeacher(f || null);
        if (f)
          setSettingsForm({
            name: f.name || '',
            mobile: f.mobile || '',
            employee_no: f.employee_no || '',
          });
      }
      if (cRes.code === 0) setContents(cRes.data.items || []);
      if (sRes.code === 0) setStats(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (c: Content) => {
    setDetailLoading(true);
    try {
      const res = await fetch('/api/contents/' + c.id, {
        headers: { Authorization: 'Bearer ' + tk() },
      });
      const json = await res.json();
      setDetail(json.code === 0 ? json.data : c);
    } catch {
      setDetail(c);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = contents.filter((c) => {
    if (filter && c.content_type !== filter) return false;
    if (search && !c.title.includes(search)) return false;
    return true;
  });

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav />
        <div className="flex items-center justify-center h-64 text-slate-400">加载中...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {teacher?.avatar_file_id ? (
                <img
                  src={`/api/files/${teacher.avatar_file_id}/preview`}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                  alt={teacher?.name}
                />
              ) : (
                <DefaultAvatar
                  name={teacher?.name || '?'}
                  gender={(teacher as any)?.gender}
                  size={56}
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-800">{teacher?.name}老师的资料空间</h1>
              </div>
            </div>
            <div className="relative group">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 hidden group-hover:block z-20">
                <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-100">
                  {teacher?.name}
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  ✏️ 修改信息
                </button>
                <button
                  onClick={() => setShowPwd(true)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  🔒 修改密码
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '个人备课', key: 'personal_lesson', icon: '📖' },
              { label: '教学反思', key: 'reflection', icon: '📝' },
              { label: '集体备课', key: 'group_lesson', icon: '👥' },
              { label: '计划总结', key: 'plan_summary', icon: '📋' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(filter === item.key ? '' : item.key)}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition ${filter === item.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{(stats as any)[item.key] || 0}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题..."
            className="w-56 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
          />
          <div className="flex-1" />
          <button
            onClick={() => setCardMode(false)}
            className={
              'px-3 py-1.5 text-xs rounded-lg ' +
              (!cardMode ? 'bg-blue-50 text-blue-700' : 'text-slate-500')
            }
          >
            📋 列表
          </button>
          <button
            onClick={() => setCardMode(true)}
            className={
              'px-3 py-1.5 text-xs rounded-lg ' +
              (cardMode ? 'bg-blue-50 text-blue-700' : 'text-slate-500')
            }
          >
            🗂 卡片
          </button>
        </div>

        {cardMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition"
              >
                <p className="text-sm text-blue-600 mb-1">
                  {typeIcons[c.content_type]} {typeLabels[c.content_type]}
                </p>
                <h3 className="font-medium text-slate-800 mb-2">{c.title}</h3>
                <p className="text-xs text-slate-400">
                  {c.academic_year} {c.semester} ·{' '}
                  {new Date(c.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="p-3 text-left">名称</th>
                  <th className="p-3 text-left">类型</th>
                  <th className="p-3 text-left">日期</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td
                      className="p-3 font-medium text-slate-800 cursor-pointer hover:text-blue-600"
                      onClick={() => openDetail(c)}
                    >
                      {c.title}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {typeIcons[c.content_type]} {typeLabels[c.content_type]}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openDetail(c)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      暂无资料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setDetail(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-fade-in-up">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-800">{detail.title}</h3>
                <button
                  onClick={() => setDetail(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-6 space-y-4">
                {detailLoading ? (
                  <p className="text-slate-400 text-sm">加载中...</p>
                ) : (
                  <>
                    <div className="flex gap-3 text-sm text-slate-500">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                        {typeLabels[detail.content_type]}
                      </span>
                      <span>
                        {detail.academic_year} {detail.semester}
                      </span>
                      <span>{new Date(detail.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    {detail.summary && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-1">摘要</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{detail.summary}</p>
                      </div>
                    )}
                    {detail.content_type === 'reflection' && (
                      <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                        📝 该教师对该课程的教学反思
                      </div>
                    )}
                    <div className="pt-4 border-t flex gap-2">
                      <button className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm hover:bg-blue-100">
                        🔍 预览
                      </button>
                      <button className="px-4 py-2 rounded-lg bg-slate-50 text-slate-600 text-sm hover:bg-slate-100">
                        📥 下载
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Dialog */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowSettings(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">修改信息</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                  <input
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
                  <input
                    value={settingsForm.mobile}
                    onChange={(e) => setSettingsForm({ ...settingsForm, mobile: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">编号</label>
                  <input
                    value={settingsForm.employee_no}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, employee_no: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm rounded-lg border"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    alert('修改成功(接口待接入)');
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Dialog */}
        {showPwd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowPwd(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">修改密码</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
                  <input
                    type="password"
                    value={pwdForm.password}
                    onChange={(e) => setPwdForm({ ...pwdForm, password: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">确认密码</label>
                  <input
                    type="password"
                    value={pwdForm.confirm}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => setShowPwd(false)}
                  className="px-4 py-2 text-sm rounded-lg border"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowPwd(false);
                    alert('密码修改成功(接口待接入)');
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
        {previewFile && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setPreviewFile(null)} />
            <div className="relative w-[720px] bg-white shadow-2xl overflow-y-auto animate-slide-in">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold truncate">{previewFile.title}</h3>
                <div className="flex gap-2">
                  <a
                    href={previewFile.url.replace('/preview', '/download')}
                    download
                    className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-700"
                  >
                    下载
                  </a>
                  <button onClick={() => setPreviewFile(null)} className="text-xl text-slate-400">
                    &times;
                  </button>
                </div>
              </div>
              <div className="p-4">
                <iframe
                  src={previewFile.url}
                  className="w-full min-h-[600px] border-0"
                  title="预览"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
