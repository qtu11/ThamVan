import { route,fail } from '@/lib/api';
// Historical per-walk checkout is retired; its consent did not cover monthly membership.
export const POST=route(async()=>fail('membershipCheckoutRequired',409));
