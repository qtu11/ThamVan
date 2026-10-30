'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { api } from '@/components/ui';
import { workspaceError } from '@/lib/workspace-errors';
import type { Locale } from '@/lib/types';
export function ActionForm({
  children,
  endpoint = '/api/workspace',
  values,
  submit = 'Lưu thay đổi',
  disabled = false,
  locale,
  onSuccess,
}: {
  children: React.ReactNode;
  endpoint?: string;
  values: (data: FormData) => unknown;
  submit?: string;
  disabled?: boolean;
  locale: Locale;
  onSuccess?: (result: Record<string, unknown>) => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  const router = useRouter();
  return (
    <form
      className="dash-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage('');
        try {
          const result = await api(endpoint, values(new FormData(event.currentTarget)));
          setError(false);
          setMessage('Đã lưu thay đổi.');
          onSuccess?.(result);
          router.refresh();
        } catch (error) {
          setError(true);
          setMessage(workspaceError(error instanceof Error ? error.message : 'error', locale));
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="button" disabled={disabled || busy}>
        {busy ? <LoaderCircle className="spin" size={16} /> : <ArrowUpRight size={16} />} {submit}
      </button>
      {message && (
        <p className={`status ${error ? 'danger' : 'success'}`} role={error ? 'alert' : 'status'}>
          {message}
        </p>
      )}
    </form>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="dash-empty">
      <span aria-hidden="true">✳</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="dash-metric">
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
