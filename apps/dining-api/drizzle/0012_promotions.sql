CREATE TYPE "public"."promotion_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "promotions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"place_id" text NOT NULL,
	"promotion_tag_text" text,
	"promotion_text" text,
	"promotion_graphic" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "promotion_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_place_id_location_data_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."location_data"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promotions_place_id" ON "promotions" USING btree ("place_id");