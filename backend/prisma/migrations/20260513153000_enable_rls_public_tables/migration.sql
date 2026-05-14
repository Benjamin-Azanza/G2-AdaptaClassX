-- Enable RLS on all application tables exposed through the public schema.
-- The Nest backend uses a direct Postgres connection as the table owner, so
-- enabling RLS here protects PostgREST/public access without changing app behavior.

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cedulas_autorizadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."paralelos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
