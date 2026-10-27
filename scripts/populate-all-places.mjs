// Compatibility entry point. Category photos must never impersonate specific locations.
import { runAuditCLI } from './audit-place-images.mjs';
await runAuditCLI();
