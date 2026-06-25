'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    router.replace(t ? '/home' : '/login');
  }, [router]);
  return null;
}
