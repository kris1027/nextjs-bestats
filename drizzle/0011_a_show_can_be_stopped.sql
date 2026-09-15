ALTER TYPE "public"."watch_state" ADD VALUE 'stopped';--> statement-breakpoint
ALTER TABLE "watch_records" DROP CONSTRAINT "watch_records_score_matches_state";--> statement-breakpoint
ALTER TABLE "watch_records" ADD CONSTRAINT "watch_records_stopped_is_a_show" CHECK ("watch_records"."kind" = 'tv' or "watch_records"."state" in ('planned', 'watched'));--> statement-breakpoint
ALTER TABLE "watch_records" ADD CONSTRAINT "watch_records_score_matches_state" CHECK (("watch_records"."state" = 'watched' and "watch_records"."score" is not null
           and "watch_records"."score" between 1 and 10)
       or ("watch_records"."state" <> 'watched' and "watch_records"."score" is null));