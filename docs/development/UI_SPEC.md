# UI 规范 (UI Spec)

> **版本**：1.0.0 | **生效日期**：2026-06-28
> **依赖**：本文件服从 `DEVELOPMENT_CONSTITUTION.md`

---

## 一、技术栈

| 层级         | 技术                           |
| ------------ | ------------------------------ |
| 框架         | Next.js 15 (App Router)        |
| UI 库        | React 19                       |
| 样式方案     | Tailwind CSS 4                 |
| 组件库       | 自建组件（`components/ui/`）   |
| 图标         | 内联 SVG / emoji               |
| 状态管理     | React hooks + Context          |

---

## 二、组件树结构

```
<html lang="zh-CN">
└── <body className="bg-slate-50">
    └── <RootLayout>                     # app/layout.tsx
        ├── <LoginPage>                  # app/login/page.tsx
        │   └── <Captcha />
        └── <AppShell>                   # components/app-shell.tsx
            ├── <TopNav />               # components/top-nav.tsx
            │   ├── Logo
            │   ├── Navigation Links
            │   └── User Menu
            │       └── <UserSettingsModal />
            └── <PageContent>
                ├── <HomePage>           # app/home/page.tsx
                ├── <WorkspacePage>      # app/workspace/page.tsx
                │   ├── <AiChatCenter />   # 左侧 70% 聊天区
                │   └── <ContentSidebar /> # 右侧 30% 成果区
                ├── <PersonalLessonsPage>
                │   ├── <FilterBar />
                │   ├── <ContentList />
                │   └── <Drawer>
                │       └── <ContentDetailPanel />
                │           └── <Timeline />
                └── <AdminShell>         # components/admin-shell.tsx
                    ├── Admin Nav
                    └── <AdminPage>      # app/admin/**/page.tsx
```

---

## 三、页面路由规范

### 3.1 路由表

| 路由                            | 组件                   | 权限     |
| ------------------------------- | ---------------------- | -------- |
| `/login`                        | LoginPage              | 公开     |
| `/`                             | HomePage               | 教师     |
| `/home`                         | HomePage               | 教师     |
| `/workspace`                    | WorkspacePage          | 教师     |
| `/workspace?session={id}`       | WorkspacePage (恢复)   | 教师     |
| `/personal-lessons`             | PersonalLessonsPage    | 教师     |
| `/group-lessons`                | GroupLessonsPage       | 教师     |
| `/reflections`                  | ReflectionsPage        | 教师     |
| `/plans`                        | PlansPage              | 教师     |
| `/teacher/{id}`                 | TeacherDetailPage      | 教师     |
| `/admin/school`                 | AdminSchoolPage        | 管理员   |
| `/admin/teachers`               | AdminTeachersPage      | 管理员   |
| `/admin/departments`            | AdminDepartmentsPage   | 管理员   |
| `/admin/home-groups`            | AdminHomeGroupsPage    | 管理员   |
| `/admin/roles`                  | AdminRolesPage         | 管理员   |
| `/admin/settings`               | AdminSettingsPage      | 管理员   |
| `/admin/settings/school`        | SchoolSettingsPage     | 管理员   |
| `/admin/settings/ai-config`     | AiConfigPage           | 管理员   |
| `/admin/settings/ai-logs`       | AiLogsPage             | 管理员   |
| `/admin/settings/academic-years`| AcademicYearsPage      | 管理员   |

### 3.2 页面文件规范

```
app/
├── page.tsx              # 首页（重定向到 /home）
├── layout.tsx            # 根布局
├── login/
│   └── page.tsx          # 登录页
├── home/
│   └── page.tsx          # 首页（教研组教师列表）
├── workspace/
│   └── page.tsx          # AI 工作台
├── personal-lessons/
│   └── page.tsx          # 个人备课
├── group-lessons/
│   └── page.tsx          # 集体备课
├── reflections/
│   └── page.tsx          # 教学反思
├── plans/
│   └── page.tsx          # 计划总结
├── teacher/
│   └── [id]/
│       └── page.tsx      # 教师详情
└── admin/
    ├── school/
    │   └── page.tsx
    ├── teachers/
    │   └── page.tsx
    ├── departments/
    │   └── page.tsx
    ├── home-groups/
    │   └── page.tsx
    ├── roles/
    │   └── page.tsx
    └── settings/
        ├── page.tsx
        ├── school/
        │   └── page.tsx
        ├── ai-config/
        │   └── page.tsx
        ├── ai-logs/
        │   └── page.tsx
        └── academic-years/
            └── page.tsx
```

---

## 四、组件规范

### 4.1 组件分类

| 目录              | 用途                             | 示例                         |
| ----------------- | -------------------------------- | ---------------------------- |
| `components/ui/`  | 通用 UI 基础组件                 | Button, Input, Badge, Drawer |
| `components/`     | 业务组件                         | AppShell, AiChatCenter       |
| `app/**/page.tsx` | 页面组件（Next.js 约定）         | WorkspacePage                |

### 4.2 现有 UI 基础组件

| 组件        | 文件                      | 用途           |
| ----------- | ------------------------- | -------------- |
| Button      | components/ui/button.tsx  | 通用按钮       |
| Input       | components/ui/input.tsx   | 通用输入框     |
| Badge       | components/ui/badge.tsx   | 状态/类型标签  |
| Drawer      | components/ui/drawer.tsx  | 侧滑详情面板   |
| Timeline    | components/ui/timeline.tsx| 时间线展示     |
| FilterBar   | components/ui/filter-bar.tsx | 筛选条件栏 |
| Pagination  | components/ui/pagination.tsx | 分页组件   |
| Base        | components/ui/base.tsx    | 基础布局组件   |

### 4.3 现有业务组件

| 组件                 | 文件                          | 用途                     |
| -------------------- | ----------------------------- | ------------------------ |
| AppShell             | components/app-shell.tsx      | 登录后的全局布局壳       |
| AdminShell           | components/admin-shell.tsx    | 管理后台布局壳           |
| TopNav               | components/top-nav.tsx        | 顶部导航栏               |
| AiChatCenter         | components/ai-chat-center.tsx | AI 聊天区（左侧70%）     |
| ContentSidebar       | components/content-sidebar.tsx | 工作成果列表（右侧30%）  |
| ContentDetailPanel   | components/content-detail-panel.tsx | 内容详情面板       |
| ContentList          | components/content-list.tsx   | 内容列表                 |
| TeacherWorkspace     | components/teacher-workspace.tsx | 教师工作台             |
| Captcha              | components/captcha.tsx        | 验证码组件               |
| UserSettingsModal    | components/user-settings-modal.tsx | 用户设置弹窗         |
| AdminUi              | components/admin-ui.tsx       | 管理后台通用 UI          |

---

## 五、样式规范

### 5.1 Tailwind CSS

- 优先使用 Tailwind utility class
- 禁止写 inline style（除非动态计算）
- 禁止创建新的 CSS 文件（使用 Tailwind 的 `@apply` 仅在必要时）

```tsx
// ✅ 正确
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-sm">
  <span className="text-lg font-semibold text-slate-800">{title}</span>
</div>

// ❌ 禁止
<div style={{ display: 'flex', padding: '24px', backgroundColor: 'white' }}>
```

### 5.2 颜色体系

| 用途           | Tailwind Class         | 说明             |
| -------------- | ---------------------- | ---------------- |
| 页面背景       | `bg-slate-50`          | 主背景色         |
| 卡片/面板      | `bg-white`             | 白色容器         |
| 主文字         | `text-slate-800`       | 正文颜色         |
| 次要文字       | `text-slate-500`       | 辅助信息         |
| 主按钮         | `bg-blue-600`          | 主要操作按钮     |
| 备课类型标签   | `bg-blue-100 text-blue-700` | 蓝色 |
| 集体备课标签   | `bg-green-100 text-green-700` | 绿色 |
| 教学反思标签   | `bg-orange-100 text-orange-700` | 橙色 |
| 计划总结标签   | `bg-purple-100 text-purple-700` | 紫色 |

### 5.3 布局规范

- 使用 Flexbox / Grid（Tailwind utility）
- 页面最大宽度：`max-w-7xl mx-auto`
- 卡片间距：`gap-4` 或 `gap-6`
- 卡片内边距：`p-4` 或 `p-6`
- 圆角：`rounded-lg`（卡片）、`rounded-md`（按钮）

---

## 六、交互规范

### 6.1 加载状态

每个异步操作必须有 loading 状态：

```tsx
// ✅ 必须有 loading 状态
{loading ? (
  <div className="flex items-center justify-center py-12">
    <Spinner />
  </div>
) : (
  <ContentList items={items} />
)}
```

### 6.2 空状态

列表为空时必须有空状态提示：

```tsx
{items.length === 0 && (
  <div className="text-center py-12 text-slate-400">
    暂无数据
  </div>
)}
```

### 6.3 错误状态

网络错误必须有错误提示和重试按钮：

```tsx
{error && (
  <div className="text-center py-8">
    <p className="text-red-500 mb-4">{error}</p>
    <Button onClick={retry}>重试</Button>
  </div>
)}
```

### 6.4 Toast 通知

操作成功/失败使用 Toast 通知（不使用 alert）：

```tsx
toast.success('保存成功');
toast.error('操作失败，请稍后重试');
```

---

## 七、API 调用规范

### 7.1 统一请求封装

```typescript
// lib/api.ts 或 services/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
```

### 7.2 统一响应格式

```typescript
interface ApiResponse<T> {
  code: number;    // 0 = 成功
  data: T;
  message: string;
}
```

---

## 八、禁止事项

- ❌ 不使用 Redux / MobX / Zustand（MVP 阶段）
- ❌ 不写 inline style（除非动态值）
- ❌ 不创建独立 CSS 文件
- ❌ 不直接操作 localStorage（通过统一的 token 工具函数）
- ❌ 不写 any 类型的组件 props
- ❌ 不做移动端适配（但组件需保持基本响应式）

---

## 九、修订记录

| 版本  | 日期       | 修改内容       |
| ----- | ---------- | -------------- |
| 1.0.0 | 2026-06-28 | 初始版本       |
