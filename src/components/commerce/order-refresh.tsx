'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
export function OrderRefresh({ locale, pending }: { locale: Locale; pending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    let checks = 0;
    const timer = setInterval(() => {
      checks++;
      if (!document.hidden) router.refresh();
      if (checks >= 12) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [pending, router]);
  return (
    <button className="button secondary" onClick={() => router.refresh()}>
      <RefreshCw size={15} />
      {copy(locale, 'Kiểm tra lại thanh toán', 'Check payment again', '重新检查付款')}
    </button>
  );
}
