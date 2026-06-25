'use client';

import { useState, useEffect } from 'react';

interface Department {
  id: number;
  name: string;
  parent_id: number;
  sort_order: number;
  status: string;
  children?: Department[];
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState(0);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    const res = await fetch('/api/admin/departments/tree?school_id=1', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.code === 0) setDepartments(json.data);
  };

  const resetForm = () => {
    setEditing(null);
    setFormName('');
    setFormParentId(0);
    setFormSortOrder(0);
  };

  const handleEdit = (dept: Department) => {
    setEditing(dept);
    setFormName(dept.name);
    setFormParentId(dept.parent_id || 0);
    setFormSortOrder(dept.sort_order);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;
      if (editing) {
        res = await fetch(`/api/admin/departments/${editing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            name: formName,
            parent_id: formParentId,
            sort_order: formSortOrder,
          }),
        });
      } else {
        res = await fetch('/api/admin/departments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            school_id: 1,
            name: formName,
            parent_id: formParentId,
            sort_order: formSortOrder,
          }),
        });
      }

      const json = await res.json();
      if (json.code === 0) {
        setMessage(editing ? '更新成功' : '创建成功');
        resetForm();
        fetchTree();
      } else {
        setMessage(json.message || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (id: number) => {
    if (!confirm('确认停用该组织？')) return;
    const res = await fetch(`/api/admin/departments/${id}/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.code === 0) fetchTree();
    else setMessage(json.message || '停用失败');
  };

  const renderTree = (items: Department[], level = 0) =>
    items.map((dept) => (
      <div key={dept.id}>
        <div
          className="flex items-center justify-between rounded border p-3 hover:bg-gray-50"
          style={{ marginLeft: level * 24 }}
        >
          <div>
            <span className="font-medium">{dept.name}</span>
            <span
              className={`ml-2 text-xs ${dept.status === 'active' ? 'text-green-600' : 'text-red-500'}`}
            >
              {dept.status === 'active' ? '启用' : '停用'}
            </span>
            <span className="ml-2 text-xs text-gray-400">排序: {dept.sort_order}</span>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => handleEdit(dept)}
              className="text-sm text-blue-600 hover:underline"
            >
              编辑
            </button>
            {dept.status === 'active' && (
              <button
                onClick={() => handleDisable(dept.id)}
                className="text-sm text-red-500 hover:underline"
              >
                停用
              </button>
            )}
          </div>
        </div>
        {dept.children && dept.children.length > 0 && renderTree(dept.children, level + 1)}
      </div>
    ));

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">组织管理</h1>
        <button
          onClick={resetForm}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + 新增组织
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow">
        <h2 className="font-medium">{editing ? `编辑: ${editing.name}` : '新增组织'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600">名称</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">上级组织ID</label>
            <input
              type="number"
              value={formParentId}
              onChange={(e) => setFormParentId(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">排序</label>
            <input
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-x-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : editing ? '更新' : '创建'}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="rounded border px-4 py-2 text-sm">
              取消
            </button>
          )}
        </div>
      </form>

      {/* Tree */}
      <div className="space-y-1 rounded-lg bg-white p-4 shadow">{renderTree(departments)}</div>
    </div>
  );
}
