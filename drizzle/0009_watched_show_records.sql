-- A Show is never Watched: it is followed through its Episodes, each Watched
-- at a Score of its own, and a Show is finished when it has ended and the
-- Viewer has scored its every Episode. So a Watched row stops being legal for
-- a Show in the migration after this. These rows cannot be repaired: a Score
-- for each Episode states facts no Viewer gave, and moving them to Planned
-- claims a Viewer means to watch what they have already watched. They go
-- instead, and so does whatever they said.
-- — docs/adr/0018-a-show-is-followed-through-its-episodes.md
-- — docs/adr/0016-a-score-is-what-makes-a-record-watched.md
--
-- Written by hand because it deletes rows: drizzle-kit generates schema, and
-- this is the data the next migration's constraint would otherwise reject.
-- It runs first for that reason.

DELETE FROM "watch_records" WHERE "kind" = 'tv' AND "state" = 'watched';
