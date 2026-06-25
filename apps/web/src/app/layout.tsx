import './globals.css';

export const metadata = {
  title: 'AI 教师工作空间',
  description: '学校备课资料共享与AI自动归档',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50">{children}</body>
    </html>
  );
}
