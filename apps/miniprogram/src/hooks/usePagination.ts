import { useState, useCallback, useRef } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export function usePagination<T>(
  fetcher: (page: number, size: number) => Promise<{ items: T[]; total: number }>,
  options: UsePaginationOptions = {}
) {
  const { pageSize = 20, initialPage = 1 } = options;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  /** 加载第一页 */
  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    try {
      const res = await fetcher(1, pageSize);
      setItems(res.items);
      setTotal(res.total);
      setPage(1);
      setHasMore(res.items.length >= pageSize);
    } finally {
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [fetcher, pageSize]);

  /** 加载下一页 */
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetcher(nextPage, pageSize);
      if (res.items.length > 0) {
        setItems(prev => [...prev, ...res.items]);
        setPage(nextPage);
      }
      setHasMore(res.items.length >= pageSize);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetcher, page, pageSize, hasMore]);

  return { items, total, page, loading, refreshing, hasMore, refresh, loadMore };
}
