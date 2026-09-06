import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL('https://image.tmdb.org/t/p/**'),
      // a Viewer's avatar, as Google and GitHub serve it. Objects rather than
      // URLs, with `search` left out: a URL object carries an empty `search`,
      // which Next reads as "no query string allowed", and GitHub's avatars
      // end in `?v=4`.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
