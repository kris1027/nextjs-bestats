CREATE TABLE "episode_records" (
	"viewer_id" uuid NOT NULL,
	"episode_id" integer NOT NULL,
	"show_id" integer NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "episode_records_viewer_id_episode_id_pk" PRIMARY KEY("viewer_id","episode_id"),
	CONSTRAINT "episode_records_score_in_range" CHECK ("episode_records"."score" between 1 and 10)
);
--> statement-breakpoint
CREATE INDEX "episode_records_viewer_show_idx" ON "episode_records" USING btree ("viewer_id","show_id");