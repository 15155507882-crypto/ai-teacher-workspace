'use client';
import { AdminShell } from '@/components/admin-shell';
import { AdminPageHeader } from '@/components/admin-ui';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

function compressImage(file: File, maxWidth = 400, maxSizeKB = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width,
          h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        let quality = 0.7;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('压缩失败'));
              if (blob.size / 1024 <= maxSizeKB || quality <= 0.2) {
                // 转回 base64 data URL
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result as string);
                fr.readAsDataURL(blob);
                return;
              }
              quality -= 0.1;
              tryCompress();
            },
            'image/jpeg',
            quality
          );
        };
        tryCompress();
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

export default function AdminSchoolPage() {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loginBg, setLoginBg] = useState<string | null>(null);
  const [loginBgFile, setLoginBgFile] = useState<File | null>(null);
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
          // 优先使用 logo_data（base64存库），否则回退到文件预览
          if (j.data.logo_data) {
            setLogo(j.data.logo_data);
          } else if (j.data.logo_file_id) {
            setLogo(`/api/files/${j.data.logo_file_id}/preview`);
          }
          if (j.data.login_bg_data) {
            setLoginBg(j.data.login_bg_data);
          } else if (j.data.login_bg_file_id) {
            setLoginBg(`/api/files/${j.data.login_bg_file_id}/preview`);
          }
        }
      });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('accessToken');

    // 压缩新图片为 base64
    let logoData: string | null | undefined = undefined;
    if (logoFile) {
      if (logoFile.size > 1024 * 1024) {
        setMsg('Logo 图片不能超过 1MB');
        setLoading(false);
        return;
      }
      try {
        logoData = await compressImage(logoFile);
      } catch {
        setMsg('图片压缩失败');
        setLoading(false);
        return;
      }
    } else if (logo === null) {
      // 用户点击了"移除"
      logoData = null;
    }

    const body: any = { name, short_name: shortName };
    if (logoData !== undefined) {
      body.logo_data = logoData;
    }

    // 登录背景图
    let loginBgData: string | null | undefined = undefined;
    if (loginBgFile) {
      if (loginBgFile.size > 1024 * 1024) {
        setMsg('背景图不能超过 1MB');
        setLoading(false);
        return;
      }
      try {
        loginBgData = await compressImage(loginBgFile, 1920, 800);
      } catch {
        setMsg('背景图压缩失败');
        setLoading(false);
        return;
      }
    } else if (loginBg === null) {
      loginBgData = null;
    }
    if (loginBgData !== undefined) {
      body.login_bg_data = loginBgData;
    }

    const res = await fetch('/api/admin/school', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setMsg(json.code === 0 ? '保存成功' : json.message);
    setLoading(false);
  };
  return (
    <AdminShell>
      <div className="p-8">
        <AdminPageHeader title="学校信息" />
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(31,45,78,0.07)] p-6">
          <form onSubmit={save} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#30466f] mb-1.5">学校全称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#30466f] mb-1.5">学校简称</label>
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#30466f] mb-1.5">学校 Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-slate-300">🏫</span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-block cursor-pointer px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-[#53688f] hover:bg-[#f7faff] transition">
                    上传图片
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1024 * 1024) {
                          setMsg('图片不能超过 1MB');
                          return;
                        }
                        setLogoFile(file);
                        const reader = new FileReader();
                        reader.onload = () => setLogo(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogo(null);
                        setLogoFile(null);
                      }}
                      className="block text-sm text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  )}
                  <p className="text-sm text-slate-400">
                    JPG/PNG，最大 1MB，上传后自动压缩至 100KB 以内
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#30466f] mb-1.5">
                登录页背景图
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                  {loginBg ? (
                    <img src={loginBg} alt="登录背景" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-slate-300">背景图</span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-block cursor-pointer px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-[#53688f] hover:bg-[#f7faff] transition">
                    上传图片
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1024 * 1024) {
                          setMsg('图片不能超过 1MB');
                          return;
                        }
                        setLoginBgFile(file);
                        const reader = new FileReader();
                        reader.onload = () => setLoginBg(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {loginBg && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginBg(null);
                        setLoginBgFile(null);
                      }}
                      className="block text-sm text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  )}
                  <p className="text-sm text-slate-400">建议 1920×1080，JPG/PNG，最大 1MB</p>
                </div>
              </div>
            </div>
            {msg && (
              <div
                className={`text-sm ${msg.includes('成功') ? 'text-green-600' : 'text-red-600'}`}
              >
                {msg}
              </div>
            )}
            <Button type="submit" disabled={loading} className="h-11 rounded-xl">
              {loading ? '保存中...' : '保存'}
            </Button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
