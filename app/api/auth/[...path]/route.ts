import { auth } from '@/lib/auth';

// `api` is a static segment, so the standing rule about top-level routes holds.
export const { GET, POST } = auth.handler();
