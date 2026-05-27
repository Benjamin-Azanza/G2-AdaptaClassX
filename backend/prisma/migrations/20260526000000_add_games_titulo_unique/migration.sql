-- Add missing UNIQUE constraint on games.titulo required for seed upserts
CREATE UNIQUE INDEX IF NOT EXISTS "games_titulo_key" ON "games"("titulo");
