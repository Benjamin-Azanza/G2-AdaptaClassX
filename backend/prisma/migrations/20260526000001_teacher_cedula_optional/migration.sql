-- Make teacher cedula optional (no longer required for registration)
ALTER TABLE "teachers" ALTER COLUMN "cedula" DROP NOT NULL;
