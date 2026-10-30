import 'server-only';
import { commerceStorageReady } from './commerce';
export const payosReady = () =>
  commerceStorageReady() &&
  process.env.COMMERCE_ENABLED === 'true' &&
  Boolean(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_CHECKSUM_KEY &&
    process.env.COMMERCE_SUPPORT_EMAIL,
  );
export const sepayReady = () =>
  commerceStorageReady() &&
  process.env.COMMERCE_ENABLED === 'true' &&
  process.env.SEPAY_CARD_ENABLED === 'true' &&
  Boolean(
    process.env.SEPAY_MERCHANT_ID &&
    process.env.SEPAY_SECRET_KEY &&
    process.env.SEPAY_IPN_SECRET &&
    process.env.COMMERCE_SUPPORT_EMAIL,
  );
