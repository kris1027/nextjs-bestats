import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `next dev` would otherwise append its own block to CLAUDE.md on every
  // start; that file is written by hand
  agentRules: false,
  // every route prerenders a shell and streams the rest; the build refuses
  // an uncached read outside a Suspense boundary, which is the point
  // — docs/adr/0010-the-shell-is-prerendered.md
  cacheComponents: true,
  images: {
    remotePatterns: [
      new URL('https://image.tmdb.org/t/p/**'),
      // a Viewer's avatar, as Google serves it. A URL like TMDB's above: the
      // empty `search` it carries is Next's "no query string allowed", which
      // holds because Google puts the size in the path — `=s96-c`, not `?sz=`.
      new URL('https://lh3.googleusercontent.com/**'),
    ],
  },
};

export default nextConfig;
