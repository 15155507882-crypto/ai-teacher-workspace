'use client';
import { useState, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  teacher: { id: number; name: string; mobile: string };
}

/** Compress image to maxWidth pixels, under maxSizeKB */
function compressImage(file: File, maxWidth = 400, maxSizeKB = 100): Promise<Blob> {
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
        // Try quality 0.7 first, reduce if needed
        let quality = 0.7;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('压缩失败'));
              if (blob.size / 1024 <= maxSizeKB || quality <= 0.2) return resolve(blob);
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

export function UserSettingsModal({ open, onClose, teacher }: Props) {
  const [tab, setTab] = useState<'phone' | 'password' | 'avatar'>('phone');
  const [mobile, setMobile] = useState(teacher.mobile);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function api(url: string, options?: RequestInit) {
    const token = localStorage.getItem('accessToken') || '';
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return res.json();
  }

  async function savePhone() {
    setSaving(true);
    setMsg('');
    const j = await api('/api/teacher/profile', {
      method: 'PUT',
      body: JSON.stringify({ mobile }),
    });
    if (j.code === 0) {
      setMsg('✅ 手机号已更新');
      updateLocalTeacher({ mobile });
    } else setMsg(j.message || '更新失败');
    setSaving(false);
  }

  async function savePassword() {
    if (newPwd.length < 6) {
      setMsg('密码至少6位');
      return;
    }
    setSaving(true);
    setMsg('');
    const j = await api('/api/teacher/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
    });
    if (j.code === 0) {
      setMsg('✅ 密码已修改，下次登录生效');
      setOldPwd('');
      setNewPwd('');
    } else setMsg(j.message || '修改失败');
    setSaving(false);
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    if (avatarFile.size > 1024 * 1024) {
      setMsg('图片不能超过 1MB');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const compressed = await compressImage(avatarFile);
      const form = new FormData();
      form.append('file', compressed, 'avatar.jpg');
      const token = localStorage.getItem('accessToken') || '';
      const uploadRes = await fetch('/api/ai/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const upJson = await uploadRes.json();
      const fileId = upJson.data?.file_id || upJson.file_id;
      if (!fileId) {
        setMsg('上传失败');
        setSaving(false);
        return;
      }
      const j = await api('/api/teacher/avatar', {
        method: 'POST',
        body: JSON.stringify({ file_id: fileId }),
      });
      if (j.code === 0) {
        setMsg('✅ 头像已更新');
        updateLocalTeacher({ avatar_file_id: fileId });
        setAvatarPreview(null);
        setAvatarFile(null);
      } else setMsg(j.message || '更新失败');
    } catch {
      setMsg('上传失败');
    }
    setSaving(false);
  }

  function updateLocalTeacher(updates: Record<string, any>) {
    const t = JSON.parse(localStorage.getItem('teacher') || '{}');
    const updated = { ...t, ...updates };
    localStorage.setItem('teacher', JSON.stringify(updated));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setMsg('图片不能超过 1MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMsg(`已选择: ${(file.size / 1024).toFixed(0)}KB，上传后压缩至 100KB 以内`);
  }

  const tabs = [
    { key: 'phone' as const, label: '📱 修改手机号' },
    { key: 'password' as const, label: '🔒 修改密码' },
    { key: 'avatar' as const, label: '🖼️ 修改头像' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-slate-800">个人设置</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="flex border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 text-sm py-2.5 text-center transition ${tab === t.key ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {msg && (
            <div
              className={`text-sm p-3 rounded-lg ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
            >
              {msg}
            </div>
          )}

          {tab === 'phone' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={savePhone}
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </>
          )}

          {tab === 'password' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">当前密码</label>
                <input
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  新密码（至少6位）
                </label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={savePassword}
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '修改密码'}
              </button>
            </>
          )}

          {tab === 'avatar' && (
            <>
              <p className="text-xs text-slate-400">
                支持 JPG/PNG，最大 1MB，上传后自动压缩至 100KB 以内
              </p>
              {avatarPreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={avatarPreview}
                    className="w-20 h-20 rounded-full object-cover border"
                    alt="预览"
                  />
                  <div className="text-xs text-slate-500">
                    <p>{(avatarFile!.size / 1024).toFixed(0)} KB</p>
                    <button
                      onClick={() => {
                        setAvatarPreview(null);
                        setAvatarFile(null);
                      }}
                      className="text-red-400 hover:underline mt-1"
                    >
                      移除
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-2xl cursor-pointer hover:border-blue-400 hover:text-blue-400"
                >
                  +
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
              {avatarFile && (
                <button
                  onClick={uploadAvatar}
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '上传中...' : '上传头像'}
                </button>
              )}
            </>
          )}

          <hr className="border-slate-100" />
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="w-full rounded-lg border border-red-200 text-red-500 py-2.5 text-sm font-medium hover:bg-red-50 transition"
          >
            退出账号
          </button>
        </div>
      </div>
    </div>
  );
}
