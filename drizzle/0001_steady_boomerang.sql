CREATE TABLE "project_member" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_project_user_unique" ON "project_member" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_member_user_idx" ON "project_member" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "project_member" ("id", "project_id", "user_id", "created_at")
SELECT gen_random_uuid()::text, p."id", wm."user_id", now()
FROM "project" p
JOIN "workspace_member" wm ON wm."workspace_id" = p."workspace_id"
ON CONFLICT ("project_id", "user_id") DO NOTHING;
