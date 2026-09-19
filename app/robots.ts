import type { MetadataRoute } from 'next';

/**
 * Everything a Visitor can read is open to a crawler. The lists are one
 * Viewer's and the sign-in routes are a flow rather than a page, so there is
 * nothing on either to index. No sitemap: the detail pages are TMDB's whole
 * catalogue, and the pages it could list are the ones a crawler finds from
 * the home page anyway.
 */
const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: [
      '/watchlist',
      '/upcoming',
      '/watched',
      '/sign-in',
      '/signed-in',
      '/api/',
    ],
  },
});

export default robots;
