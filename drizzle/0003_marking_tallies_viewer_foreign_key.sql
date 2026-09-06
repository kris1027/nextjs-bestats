-- A marking tally belongs to a Viewer the same way a Watch Record does, and
-- for the same reason it is a migration of its own: Neon owns neon_auth.user,
-- drizzle-kit manages `public` only, and a Drizzle `references()` across that
-- line makes it try to create the table it is pointing at. Deleting a Viewer
-- therefore takes their tally with it, by the schema's own doing.
-- — docs/adr/0005-the-viewer-lives-beside-the-domain.md

ALTER TABLE "marking_tallies"
  ADD CONSTRAINT "marking_tallies_viewer_id_neon_auth_user_id_fk"
  FOREIGN KEY ("viewer_id")
  REFERENCES "neon_auth"."user" ("id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
