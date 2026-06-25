import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 教师工作空间',
  description: '学校备课资料共享与AI自动归档工作空间',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
