-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OUVRIER', 'CHEF_CHANTIER');

-- CreateEnum
CREATE TYPE "StatutChantier" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "TypePhoto" AS ENUM ('AVANT', 'APRES');

-- CreateEnum
CREATE TYPE "FormatExport" AS ENUM ('CSV', 'PDF');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OUVRIER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adresses" (
    "id" TEXT NOT NULL,
    "rue" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "code_postal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "pays" TEXT NOT NULL,

    CONSTRAINT "adresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chantiers" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut" "StatutChantier" NOT NULL DEFAULT 'EN_ATTENTE',
    "date_debut_prevue" DATE NOT NULL,
    "date_fin_prevue" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_client" TEXT NOT NULL,
    "id_adresse" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "chantiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations_chantier" (
    "id" TEXT NOT NULL,
    "role_sur_chantier" "Role" NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE,
    "id_chantier" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,

    CONSTRAINT "affectations_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TypePhoto" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "commentaire" TEXT,
    "id_chantier" TEXT NOT NULL,
    "taken_by" TEXT NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports_export" (
    "id" TEXT NOT NULL,
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" "FormatExport" NOT NULL,
    "type" TEXT NOT NULL,
    "id_chantier" TEXT NOT NULL,
    "exported_by" TEXT NOT NULL,

    CONSTRAINT "rapports_export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meteo_snapshots" (
    "id" TEXT NOT NULL,
    "date_snapshot" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "id_chantier" TEXT NOT NULL,

    CONSTRAINT "meteo_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- AddForeignKey
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_id_adresse_fkey" FOREIGN KEY ("id_adresse") REFERENCES "adresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_chantier" ADD CONSTRAINT "affectations_chantier_id_chantier_fkey" FOREIGN KEY ("id_chantier") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_chantier" ADD CONSTRAINT "affectations_chantier_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_id_chantier_fkey" FOREIGN KEY ("id_chantier") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_taken_by_fkey" FOREIGN KEY ("taken_by") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_export" ADD CONSTRAINT "rapports_export_id_chantier_fkey" FOREIGN KEY ("id_chantier") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports_export" ADD CONSTRAINT "rapports_export_exported_by_fkey" FOREIGN KEY ("exported_by") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meteo_snapshots" ADD CONSTRAINT "meteo_snapshots_id_chantier_fkey" FOREIGN KEY ("id_chantier") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
