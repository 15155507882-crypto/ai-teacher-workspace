import './globals.css';

export const metadata = {
  title: 'AI 教师工作空间',
  description: '学校备课资料共享与AI自动归档',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50">{children}</body>
    </html>
  );
}
