# AI 教师工作空间 CHANGELOG

## V2.8 更新日志（2026-06-29）

### 新增功能

#### 文档预览系统 V2

- 双文件机制：原文件 + 预览 PDF 独立存储
- LibreOffice Headless 转换：Word/Excel/PPT → PDF
- 上传后自动入队预览队列（BullMQ）
- 下载始终返回原文件
- FileAsset 新增字段：preview_url / preview_status / preview_error / preview_updated_at

#### 评论权限控制

- 个人备课留言：仅限本人（+ 管理员可绕过）
- 时间限制：个人备课 7 天 / 集体备课 3 天关闭留言通道
- 管理员不受时间限制

#### 通用确认弹窗

- 新增 `ConfirmDialog` 组件，替换所有浏览器原生 `confirm()`
- 支持 danger/普通 两种样式
- 删除评论、删除会话等场景统一使用

### 优化改进

#### 后台管理 UI

- 左侧品牌区 V2：160px 渐变头部 + Logo 56×56 + 版本标识 + 波浪装饰
- 侧边栏 280px，菜单 48px 高度，蓝色左边框激活态
- 统一颜色体系（#10234F/#53688F/#E8EEF7/#2E6CFF）
- 表格卡片 rounded-2xl + 阴影 + bg-[#f7faff] 表头

#### 教师空间页美化

- 渐变背景 + 2xl 卡片 + lucide 图标统计区
- 共用 `LessonDetailPanel` + `Drawer` 组件
- 头像统一为 emoji 风格（移除"管"字）

#### 首页性能优化

- content-stats 接口防重复请求（useRef guard）
- 修复 useEffect([router]) 无限循环（3 个文件）
- 后端接口增加 x-caller 日志追踪

#### 评论系统修复

- 修复 ResponseInterceptor 包裹导致评论不即时显示
- 修复删除后内容仍显示的 bug
- 教学反思/计划总结评论加载补全

#### 头部品牌区优化

- Logo 48×48px + 学校名称 18px/700
- 副标题改为"智能备课平台"
- Header 72px + HarmonyOS Sans SC 字体

#### 预览端点修复

- Office 文件无预览时返回 PENDING 状态，不再触发浏览器下载

### 数据库变更

| 表           | 变更                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `file_asset` | +preview_url / +preview_status / +preview_error / +preview_updated_at |

---

## V2.7 更新日志

### 新增功能

#### 学年/学期设置

- 新增 `school.settings` JSON 字段，存储学年、学期等系统级配置
- `/admin/settings` 页面：设置当前学年/学期
- 首页备课/反思数按本学期统计（`getContentStats` 加学期过滤）

#### 个人设置弹窗

- 新增 `user-settings-modal.tsx`：修改手机号、密码、头像
- 头像上传 Canvas 压缩（≤100KB），8 种彩色渐变默认头像
- API: `PATCH /api/teachers/profile`、`PATCH /api/teachers/password`

#### Excel 批量导入

- 教师批量导入支持 `.xlsx` / `.xls` 格式（原仅 CSV）
- 组织名称自动映射、中文角色识别
- CSV 模板更新

### 优化改进

#### 教师管理

- 新增 `teacher.gender` 字段（entity + migration + DTO + 表单 + 导入全覆盖）
- 教师空间标题改为「XX老师的资料空间」
- 默认彩色头像（男女各 4 种渐变）

#### 用户体验

- 所有新增弹窗加「保存并继续」按钮
- 响应拦截器修复：`typeof code === 'number'` 避免 `HomeGroup.code` 误判
- 学校 Logo 上传压缩限制（1MB → 100KB）

#### 服务配置

- `next.config.ts` 代理指向 API 端口 3001
- 前端端口 8080

### 数据库变更

| 表        | 变更                  |
| --------- | --------------------- |
| `school`  | +`settings` JSON      |
| `teacher` | +`gender` VARCHAR(10) |

### 迁移文件

- `1748120000000-AddSchoolSettings`
- `1748121000000-AddTeacherGender`

---

## V2.2 更新日志

### 新增功能

#### 备课组目录

- 新增 `home_groups` 表，独立于组织管理
- 后台 `/admin/home-groups` 页面：CRUD、排序、首页显示开关、停用/启用
- CSV 批量导入备课组
- 教师分配弹窗（勾选在职教师）
- 首页数据源切换：从 departments → home_groups
- API: `GET/POST/PUT/DELETE /api/admin/home-groups`、`GET /api/home/groups`

#### AI 配置后台

- `/admin/ai-config` 页面：Provider 选择、API Key 加密存储、Base URL、默认模型
- 连接测试、Token 统计（今日/本周/本月/累计）
- API Key AES-256-CBC 加密

#### 教师批量导入

- CSV 模板下载 + 批量导入
- API: `POST /api/admin/teachers/batch-import`

#### 文件预览

- `GET /api/files/:id/preview` 公开接口（图片/PDF 在线预览）
- `GET /api/files/:id/download` 文件下载
- 详情 Drawer 预览按钮

#### 验证码系统

- 数学题 SVG 验证码
- Captcha 组件 + useCaptcha Hook
- Redis 存储（5分钟 TTL）

### 优化改进

#### UI 组件

- shadcn/ui 风格统一：Button、Input、Badge、Drawer、Pagination
- TopNav 固定吸顶、Logo 显示
- 教师空间设置下拉（修改信息/密码）
- 组织管理：排序首列、停用排最后、上级显示名称

#### 列表与分页

- 全部列表页 20 条/页分页
- 搜索筛选 + 学期下拉
- 文字放大（14px→16px）

#### 权限

- API Key 加密存储
- 教师不可见 AI 配置
- 删除权限：教师本人 / 管理员全部

#### AI 对话框

- 70%/30% 两栏布局
- 附件上传 + 预览
- AI 思考步骤反馈
- 结构化识别确认卡片
- 教学反思关联推荐

### 数据库变更

| 表                | 变更                                                       |
| ----------------- | ---------------------------------------------------------- |
| `ai_providers`    | 新增                                                       |
| `ai_configs`      | 新增                                                       |
| `ai_call_logs`    | 新增                                                       |
| `home_groups`     | 新增                                                       |
| `action_history`  | 新增                                                       |
| `ai_decision_log` | 新增                                                       |
| `system_config`   | 新增                                                       |
| `personal_lesson` | +week_no                                                   |
| `group_lesson`    | +week_no, group_lesson_type                                |
| `reflection`      | +match_score                                               |
| `file_asset`      | +parsed_text, preview_status, extension, size              |
| `teacher`         | +employee_no, avatar, sort, is_home_visible, token_version |
| `content`         | +version, is_latest                                        |
| `login_log`       | +device, browser, os                                       |

### 测试账号

| 角色       | 手机号                  | 密码         |
| ---------- | ----------------------- | ------------ |
| 管理员     | 13800000001             | Teacher@2026 |
| 教师(30位) | 13910000001~13910000030 | Teacher@2026 |
