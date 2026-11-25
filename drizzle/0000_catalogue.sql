CREATE TYPE "public"."adaptation_kind" AS ENUM('film', 'tv_series', 'miniseries', 'animated_film', 'animated_series', 'anime', 'comic', 'video_game', 'game', 'stage', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."edition_region" AS ENUM('PT', 'BR');--> statement-breakpoint
CREATE TYPE "public"."tmdb_type" AS ENUM('movie', 'tv');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('full', 'stub', 'pending');--> statement-breakpoint
CREATE TABLE "adaptations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "adaptations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"original_title" text,
	"kind" "adaptation_kind" DEFAULT 'other' NOT NULL,
	"year" integer,
	"credits" text,
	"overview" text,
	"poster_url" text,
	"wikidata_id" text,
	"tmdb_id" integer,
	"tmdb_type" "tmdb_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adaptations_wikidataId_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "authors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"wikidata_id" text,
	"open_library_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug"),
	CONSTRAINT "authors_wikidataId_unique" UNIQUE("wikidata_id"),
	CONSTRAINT "authors_openLibraryId_unique" UNIQUE("open_library_id")
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "editions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"work_id" integer NOT NULL,
	"title" text NOT NULL,
	"language" text,
	"region" "edition_region",
	"publisher" text,
	"publish_year" integer,
	"isbn13" text,
	"isbn10" text,
	"cover_url" text,
	"open_library_edition_id" text,
	"google_books_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_openLibraryEditionId_unique" UNIQUE("open_library_edition_id"),
	CONSTRAINT "editions_googleBooksId_unique" UNIQUE("google_books_id")
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "series_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"wikidata_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug"),
	CONSTRAINT "series_wikidataId_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "series_works" (
	"series_id" integer NOT NULL,
	"work_id" integer NOT NULL,
	"ordinal" text,
	"sort_key" real,
	CONSTRAINT "series_works_series_id_work_id_pk" PRIMARY KEY("series_id","work_id")
);
--> statement-breakpoint
CREATE TABLE "work_adaptations" (
	"work_id" integer NOT NULL,
	"adaptation_id" integer NOT NULL,
	"via_series" boolean DEFAULT false NOT NULL,
	CONSTRAINT "work_adaptations_work_id_adaptation_id_pk" PRIMARY KEY("work_id","adaptation_id")
);
--> statement-breakpoint
CREATE TABLE "work_authors" (
	"work_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "work_authors_work_id_author_id_pk" PRIMARY KEY("work_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "works_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"original_language" text,
	"first_published_year" integer,
	"synopsis" text,
	"synopsis_language" text,
	"synopsis_source_url" text,
	"cover_url" text,
	"subjects" text[] DEFAULT '{}'::text[] NOT NULL,
	"wikidata_id" text,
	"open_library_work_id" text,
	"status" "work_status" DEFAULT 'full' NOT NULL,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "works_slug_unique" UNIQUE("slug"),
	CONSTRAINT "works_wikidataId_unique" UNIQUE("wikidata_id"),
	CONSTRAINT "works_openLibraryWorkId_unique" UNIQUE("open_library_work_id")
);
--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_works" ADD CONSTRAINT "series_works_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_works" ADD CONSTRAINT "series_works_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_adaptations" ADD CONSTRAINT "work_adaptations_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_adaptations" ADD CONSTRAINT "work_adaptations_adaptation_id_adaptations_id_fk" FOREIGN KEY ("adaptation_id") REFERENCES "public"."adaptations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_authors" ADD CONSTRAINT "work_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "editions_work_id_index" ON "editions" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "editions_isbn13_index" ON "editions" USING btree ("isbn13");--> statement-breakpoint
CREATE INDEX "editions_language_index" ON "editions" USING btree ("language");--> statement-breakpoint
CREATE INDEX "series_works_work_id_index" ON "series_works" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "work_adaptations_adaptation_id_index" ON "work_adaptations" USING btree ("adaptation_id");--> statement-breakpoint
CREATE INDEX "work_authors_author_id_index" ON "work_authors" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "works_status_index" ON "works" USING btree ("status");