'use client';
import { useState, useCallback, useEffect } from 'react';

interface CaptchaData {
  captchaId: string;
  imageBase64: string;
}

export function useCaptcha() {
  const [data, setData] = useState<CaptchaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/captcha?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const json = await res.json();
      if (json.code === 0 && json.data) {
        setData(json.data);
      } else {
        setError('验证码加载失败');
      }
    } catch {
      setError('网络错误，点击刷新');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  return {
    captchaId: data?.captchaId || '',
    imageBase64: data?.imageBase64 || '',
    loading,
    error,
    refresh: fetchCaptcha,
  };
}
