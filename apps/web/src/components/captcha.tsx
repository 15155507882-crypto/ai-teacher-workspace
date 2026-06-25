'use client';
import React from 'react';

interface CaptchaProps {
  imageBase64: string;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  width?: number;
  height?: number;
}

export function Captcha({
  imageBase64,
  loading,
  error,
  onRefresh,
  width = 160,
  height = 50,
}: CaptchaProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2" style={{ width, height }}>
        <div className="w-full h-full rounded-lg bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2" style={{ width, height }}>
        <button
          onClick={onRefresh}
          className="w-full h-full rounded-lg border border-red-200 bg-red-50 flex items-center justify-center text-xs text-red-500 hover:bg-red-100 transition"
        >
          {error}，点击刷新
        </button>
      </div>
    );
  }

  if (!imageBase64) return null;

  return (
    <div className="flex items-center gap-2">
      <img
        src={imageBase64}
        alt="验证码"
        width={width}
        height={height}
        className="rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 transition"
        onClick={onRefresh}
        title="看不清？点击刷新"
      />
      <button onClick={onRefresh} className="text-xs text-slate-400 hover:text-blue-500 shrink-0">
        换一张
      </button>
    </div>
  );
}
