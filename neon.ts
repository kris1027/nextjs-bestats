import { defineConfig } from '@neon/config/v1';

/**
 * Which Neon services every branch of this project carries, declared here so
 * the answer lives in the repo and arrives in a pull request rather than in a
 * console someone has to be told about.
 *
 * `auth` is Managed Better Auth: the Viewer's tables sit in the `neon_auth`
 * schema of this same database, which is what lets `watch_records.viewer_id`
 * be a real foreign key.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */
export default defineConfig({
  auth: true,
});
