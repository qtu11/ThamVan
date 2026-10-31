'use client';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export function SecurityGuard() {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let warningTimeout: NodeJS.Timeout;

    function triggerWarning(msg: string) {
      setWarning(msg);
      clearTimeout(warningTimeout);
      warningTimeout = setTimeout(() => {
        setWarning(null);
      }, 2500);
    }

    // Chặn các tổ hợp phím mở DevTools và xem mã nguồn
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // 1. F12 (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Phím tắt F12 (DevTools) đã bị vô hiệu hóa để bảo vệ mã nguồn.');
        return false;
      }

      // 2. Ctrl + U (View Source)
      if (modKey && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Xem mã nguồn trang (Ctrl + U) đã bị khóa.');
        return false;
      }

      // 3. Ctrl + Shift + I (Inspect)
      if (modKey && e.shiftKey && key === 'i') {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Công cụ kiểm tra phần tử (Inspect) đã bị khóa.');
        return false;
      }

      // 4. Ctrl + Shift + J (Console)
      if (modKey && e.shiftKey && key === 'j') {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Bảng điều khiển Console đã bị khóa.');
        return false;
      }

      // 5. Ctrl + Shift + C (Inspect Element)
      if (modKey && e.shiftKey && key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Công cụ kiểm tra mã đã bị khóa.');
        return false;
      }

      // 6. Ctrl + S (Save Page)
      if (modKey && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Tính năng lưu trang web đã bị vô hiệu hóa.');
        return false;
      }
    }

    // Chặn chuột phải (Context Menu) - ngoại trừ các ô nhập văn bản input/textarea
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return; // Cho phép chuột phải trong ô nhập để copy/paste bình thường
      }
      e.preventDefault();
      triggerWarning('Chuột phải đã bị vô hiệu hóa để bảo vệ bản quyền & mã nguồn.');
      return false;
    }

    // Chặn kéo thả hình ảnh ra ngoài để xem asset
    function handleDragStart(e: DragEvent) {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    }

    // In cảnh báo bảo mật trong Console
    if (typeof console !== 'undefined') {
      try {
        console.log(
          '%cTHÁM VĂN SECURITY SHIELD',
          'color: #963a1b; font-size: 20px; font-weight: bold; background: #fefbf6; padding: 4px 8px; border-radius: 4px; border: 1px solid #dfd7c5;'
        );
        console.log(
          '%cKhu vực được bảo vệ quyền sở hữu trí tuệ. Mọi hành vi trích xuất hoặc sao chép mã nguồn đều bị nghiêm cấm.',
          'color: #114436; font-size: 13px; font-weight: 500;'
        );
      } catch {
        // Bỏ qua nếu môi trường không hỗ trợ styling console
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      clearTimeout(warningTimeout);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);

  if (!warning) return null;

  return (
    <div className="security-toast-alert" role="alert" aria-live="assertive">
      <ShieldAlert size={18} className="security-toast-icon" />
      <span>{warning}</span>
    </div>
  );
}

