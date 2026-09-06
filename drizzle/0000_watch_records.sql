CREATE TYPE "public"."media_kind" AS ENUM('tv', 'movie');--> statement-breakpoint
CREATE TYPE "public"."watch_state" AS ENUM('planned', 'watched');--> statement-breakpoint
CREATE TABLE "watch_records" (
	"viewer_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"tmdb_id" integer NOT NULL,
	"state" "watch_state" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_records_viewer_id_kind_tmdb_id_pk" PRIMARY KEY("viewer_id","kind","tmdb_id")
);
--> statement-breakpoint
CREATE INDEX "watch_records_viewer_state_idx" ON "watch_records" USING btree ("viewer_id","state","updated_at" DESC NULLS LAST);