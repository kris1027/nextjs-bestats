import { auth } from '@/lib/auth';

// `api` is a static segment, so the standing rule about top-level routes holds
// — docs/adr/0001-one-route-serves-both-kinds.md
export const { GET, POST } = auth.handler();
