CREATE TABLE "similarity_votes" (
	"user_id" text NOT NULL,
	"work_a" integer NOT NULL,
	"work_b" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "similarity_votes_user_id_work_a_work_b_pk" PRIMARY KEY("user_id","work_a","work_b"),
	CONSTRAINT "ordered_pair" CHECK ("similarity_votes"."work_a" < "similarity_votes"."work_b")
);
--> statement-breakpoint
CREATE TABLE "taste_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"format" text,
	"pace" text,
	"series_pref" text,
	"adaptations_pref" text,
	"language" text,
	"box_pref" text,
	"loved_work_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "similarity_votes" ADD CONSTRAINT "similarity_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_votes" ADD CONSTRAINT "similarity_votes_work_a_works_id_fk" FOREIGN KEY ("work_a") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_votes" ADD CONSTRAINT "similarity_votes_work_b_works_id_fk" FOREIGN KEY ("work_b") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taste_profiles" ADD CONSTRAINT "taste_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "similarity_votes_work_a_work_b_index" ON "similarity_votes" USING btree ("work_a","work_b");--> statement-breakpoint
CREATE INDEX "similarity_votes_work_b_index" ON "similarity_votes" USING btree ("work_b");