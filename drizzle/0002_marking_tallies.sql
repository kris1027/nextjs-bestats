CREATE TABLE "marking_tallies" (
	"viewer_id" uuid PRIMARY KEY NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"tally" integer DEFAULT 1 NOT NULL
);
