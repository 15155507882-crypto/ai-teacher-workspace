# AI 教师工作空间 CHANGELOG

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

| 表 | 变更 |
|----|------|
| `ai_providers` | 新增 |
| `ai_configs` | 新增 |
| `ai_call_logs` | 新增 |
| `home_groups` | 新增 |
| `action_history` | 新增 |
| `ai_decision_log` | 新增 |
| `system_config` | 新增 |
| `personal_lesson` | +week_no |
| `group_lesson` | +week_no, group_lesson_type |
| `reflection` | +match_score |
| `file_asset` | +parsed_text, preview_status, extension, size |
| `teacher` | +employee_no, avatar, sort, is_home_visible, token_version |
| `content` | +version, is_latest |
| `login_log` | +device, browser, os |

### 测试账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 管理员 | 13800000001 | Teacher@2026 |
| 教师(30位) | 13910000001~13910000030 | Teacher@2026 |
