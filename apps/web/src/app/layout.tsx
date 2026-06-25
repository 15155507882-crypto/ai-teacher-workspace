import './globals.css';
import { SidebarLayout } from './sidebar-layout';

export const metadata = {
  title: 'AI 教师工作空间',
  description: '备课资料共享与AI自动归档',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
