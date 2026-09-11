-- A check constraint passes on NULL as well as on true, and
-- `null between 1 and 10` is NULL, so the constraint added in 0005 admitted
-- the one row it was written to forbid: Watched, with no Score. The version
-- below tests for the null itself.
--
-- The delete is for rows that got in while 0005's version stood. Such a row
-- is unreadable by hand — `toMarking` throws on it rather than invent a Score
-- — so there is nothing to repair, and the constraint cannot be added while
-- one exists.
-- — docs/adr/0016-a-score-is-what-makes-a-record-watched.md

DELETE FROM "watch_records" WHERE "state" = 'watched' AND "score" IS NULL;--> statement-breakpoint
ALTER TABLE "watch_records" DROP CONSTRAINT "watch_records_score_matches_state";--> statement-breakpoint
ALTER TABLE "watch_records" ADD CONSTRAINT "watch_records_score_matches_state" CHECK (("watch_records"."state" = 'planned' and "watch_records"."score" is null)
       or ("watch_records"."state" = 'watched' and "watch_records"."score" is not null
           and "watch_records"."score" between 1 and 10));