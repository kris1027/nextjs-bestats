ALTER TABLE "watch_records" ADD COLUMN "score" smallint;--> statement-breakpoint
ALTER TABLE "watch_records" ADD CONSTRAINT "watch_records_score_matches_state" CHECK (("watch_records"."state" = 'planned' and "watch_records"."score" is null)
       or ("watch_records"."state" = 'watched' and "watch_records"."score" between 1 and 10));