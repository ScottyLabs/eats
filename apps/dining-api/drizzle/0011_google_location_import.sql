CREATE TABLE "external_google_locations" (
	"google_place_id" text PRIMARY KEY NOT NULL,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "location_data" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "location_data" ALTER COLUMN "accepts_online_orders" DROP NOT NULL;--> statement-breakpoint
-- Existing locations come from the CMU dining scraper.
ALTER TABLE "location_data" ADD COLUMN "location_is_on_campus" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "location_data" ALTER COLUMN "location_is_on_campus" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "location_data" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "location_data" ADD COLUMN "hours_valid_through" date;--> statement-breakpoint
ALTER TABLE "location_data" ADD CONSTRAINT "location_data_google_place_id_unique" UNIQUE("google_place_id");
