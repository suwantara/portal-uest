CREATE TABLE "task_assignee" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "task_assignee" ("id", "task_id", "user_id", "created_at")
SELECT gen_random_uuid()::text, "id", "assignee_id", "created_at"
FROM "task"
WHERE "assignee_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_assignee_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "task_assignee_idx";--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_assignee_task_user_unique" ON "task_assignee" USING btree ("task_id","user_id");--> statement-breakpoint
CREATE INDEX "task_assignee_user_idx" ON "task_assignee" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "assignee_id";