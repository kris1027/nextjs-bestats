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
      // a Viewer's avatar, as Google serves it. An object rather than a URL,
      // with `search` left out: a URL object carries an empty `search`, which
      // Next reads as "no query string allowed".
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
