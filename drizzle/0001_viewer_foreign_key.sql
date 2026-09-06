-- A Watch Record belongs to a Viewer, and Neon Auth keeps Viewers in
-- neon_auth.user of this same database — which is what makes this a real
-- foreign key rather than an id we hope still refers to someone. Deleting a
-- Viewer therefore takes their Watch Records with it, by the schema's own
-- doing.
-- — docs/adr/0005-the-viewer-lives-beside-the-domain.md
--
-- Written by hand rather than generated: drizzle-kit manages `public` only, so
-- a Drizzle `references()` to a table it cannot see makes it try to create
-- that table instead of pointing at it.

ALTER TABLE "watch_records"
  ADD CONSTRAINT "watch_records_viewer_id_neon_auth_user_id_fk"
  FOREIGN KEY ("viewer_id")
  REFERENCES "neon_auth"."user" ("id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
