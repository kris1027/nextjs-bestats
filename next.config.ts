import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL('https://image.tmdb.org/t/p/**'),
      // a Viewer's avatar, as Google and GitHub serve it
      new URL('https://lh3.googleusercontent.com/**'),
      new URL('https://avatars.githubusercontent.com/**'),
    ],
  },
};

export default nextConfig;
