import { useState, useCallback, useRef, useEffect } from 'react';
import { aiService } from '../services/ai';
import { RecognitionResult } from '../types/api';

interface UsePollingOptions {
  messageId: number | null;
  interval?: number;
  maxAttempts?: number;
  onCompleted?: (result: RecognitionResult) => void;
  onTimeout?: () => void;
  onError?: (err: Error) => void;
}

export function usePolling({
  messageId,
  interval = 1200,
  maxAttempts = 50,
  onCompleted,
  onTimeout,
  onError,
}: UsePollingOptions) {
  const [status, setStatus] = useState<'idle' | 'polling' | 'completed' | 'timeout' | 'error'>('idle');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string>('');
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!messageId) return;
    stop();
    stoppedRef.current = false;
    attemptsRef.current = 0;
    setStatus('polling');
    setError('');

    const poll = async () => {
      if (stoppedRef.current) return;
      attemptsRef.current++;

      if (attemptsRef.current > maxAttempts) {
        stop();
        setStatus('timeout');
        onTimeout?.();
        return;
      }

      try {
        const res = await aiService.getRecognition(messageId);
        if (res.status === 'completed') {
          stop();
          setStatus('completed');
          setResult(res);
          onCompleted?.(res);
        } else if (res.status === 'timeout') {
          stop();
          setStatus('timeout');
          onTimeout?.();
        }
        // 'pending' → continue polling
      } catch (err: any) {
        stop();
        setStatus('error');
        setError(err.message || '轮询失败');
        onError?.(err);
      }
    };

    // 立即执行第一次
    poll();
    // 设置定时器
    timerRef.current = setInterval(poll, interval);
  }, [messageId, interval, maxAttempts, stop, onCompleted, onTimeout, onError]);

  // 组件卸载时清理
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { status, result, error, start, stop };
}
