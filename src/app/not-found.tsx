import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container empty">
      <span className="eyebrow">404 · THÁM VĂN</span>
      <h1>Không tìm thấy trang · Page not found</h1>
      <Link href="/vi" className="button">
        Trang chủ · Home
      </Link>
    </div>
  );
}
