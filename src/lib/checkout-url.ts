export function isPaymentUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' && url.hostname === 'pay.payos.vn' && !url.username && !url.password
    );
  } catch {
    return false;
  }
}
