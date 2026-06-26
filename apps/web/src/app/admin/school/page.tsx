'use client';
import { AdminShell } from '@/components/admin-shell';
import { AppCard } from '@/components/ui/base';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function AdminSchoolPage() {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    fetch('/api/admin/school', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setName(j.data.name);
          setShortName(j.data.short_name);
        }
      });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('accessToken');

    // Upload logo first if there's a new one
    let logoFileId = null;
    if (logoFile) {
      const formData = new FormData();
      formData.append('file', logoFile);
      const uploadRes = await fetch('/api/ai/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (uploadJson.code === 0) logoFileId = uploadJson.data.file_id;
    }

    const res = await fetch('/api/admin/school', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, short_name: shortName, logo_file_id: logoFileId }),
    });
    const json = await res.json();
    setMsg(json.code === 0 ? '保存成功' : json.message);
    setLoading(false);
  };
  return (
    <AdminShell>
      <AppCard className="p-6 max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1">
              学校全称
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1">
              学校简称
            </label>
            <input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-normal)] mb-1">学校 Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-slate-300">🏫</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-block cursor-pointer px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                  上传图片
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLogoFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setLogo(reader.result as string);
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {logo && (
                  <button type="button" onClick={() => { setLogo(null); setLogoFile(null); }} className="block text-xs text-red-500 hover:underline">移除</button>
                )}
                <p className="text-xs text-slate-400">建议 1:1 正方形图片，自动裁剪适配</p>
              </div>
            </div>
          </div>
          {msg && (
            <div className={`text-sm ${msg.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
              {msg}
            </div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </form>
      </AppCard>
    </AdminShell>
  );
}
