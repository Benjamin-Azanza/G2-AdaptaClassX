-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "Tema" AS ENUM ('LENGUA_CULTURA', 'COMUNICACION_ORAL', 'LECTURA', 'ESCRITURA', 'LITERATURA');

-- CreateEnum
CREATE TYPE "TipoJuego" AS ENUM ('BASE', 'CAMBIANTE');

-- CreateEnum
CREATE TYPE "TipoFuente" AS ENUM ('DEFAULT', 'MANUAL', 'IA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "puntos_xp" INTEGER NOT NULL DEFAULT 0,
    "racha_dias" INTEGER NOT NULL DEFAULT 0,
    "last_login_date" DATE,
    "paralelo_id" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "cedulas_autorizadas" (
    "cedula" TEXT NOT NULL,
    "nombre_referencia" TEXT NOT NULL,

    CONSTRAINT "cedulas_autorizadas_pkey" PRIMARY KEY ("cedula")
);

-- CreateTable
CREATE TABLE "paralelos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "grado" INTEGER NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "codigo_acceso" VARCHAR(6) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paralelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" "Tema" NOT NULL,
    "tipo" "TipoJuego" NOT NULL,
    "acepta_preguntas_ia" BOOLEAN NOT NULL DEFAULT false,
    "config_default" JSONB,
    "grado_min" INTEGER NOT NULL,
    "grado_max" INTEGER NOT NULL,
    "descripcion" TEXT,
    "thumbnail_url" TEXT,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_content" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "grado" INTEGER NOT NULL,
    "contenido_json" JSONB NOT NULL,

    CONSTRAINT "game_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_questions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "paralelo_id" TEXT,
    "preguntas_json" JSONB NOT NULL,
    "tipo_fuente" "TipoFuente" NOT NULL DEFAULT 'DEFAULT',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "paralelo_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "minutos_requeridos" INTEGER NOT NULL,
    "fecha_limite" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "minutos_jugados" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "xp_otorgado" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_cedula_key" ON "teachers"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "paralelos_codigo_acceso_key" ON "paralelos"("codigo_acceso");

-- CreateIndex
CREATE UNIQUE INDEX "game_content_game_id_grado_key" ON "game_content"("game_id", "grado");

-- CreateIndex
CREATE UNIQUE INDEX "game_questions_game_id_paralelo_id_key" ON "game_questions"("game_id", "paralelo_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_student_id_assignment_id_key" ON "student_progress"("student_id", "assignment_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paralelos" ADD CONSTRAINT "paralelos_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_content" ADD CONSTRAINT "game_content_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
