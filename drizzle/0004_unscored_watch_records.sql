-- Giving a Score is what makes a Watch Record Watched, so a Watched row
-- without one stops being a legal row in the migration after this. These rows
-- predate the Score and cannot be repaired: inventing a Score states a fact no
-- Viewer gave, and moving them to Planned claims a Viewer means to watch what
-- they have already watched. They go instead, and the Watched list starts
-- empty.
-- — docs/adr/0016-a-score-is-what-makes-a-record-watched.md
-- — docs/adr/0002-placeholder-facts-are-not-facts.md
--
-- Written by hand because it deletes rows: drizzle-kit generates schema, and
-- this is the data the next migration's constraint would otherwise reject.
-- It runs first for that reason.

DELETE FROM "watch_records" WHERE "state" = 'watched';
