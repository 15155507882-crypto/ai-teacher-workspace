'use client';

import { useState, useEffect } from 'react';

export default function AdminSchoolPage() {
  const [school, setSchool] = useState<any>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSchool();
  }, []);

  const getToken = () => localStorage.getItem('accessToken');

  const fetchSchool = async () => {
    try {
      const res = await fetch('/api/admin/school', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setSchool(json.data);
        setName(json.data.name);
        setShortName(json.data.short_name);
      }
    } catch (err) {
      // 尚未配置
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/school', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name, short_name: shortName }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setMessage('保存成功');
        setSchool(json.data);
      } else {
        setMessage(json.message || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">学校信息管理</h1>

      {message && (
        <div
          className={`mb-4 rounded p-3 text-sm ${message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">学校全称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">学校简称</label>
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            maxLength={50}
            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  );
}
