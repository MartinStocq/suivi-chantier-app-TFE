-- CreateEnum
CREATE TYPE "TypeActionJournal" AS ENUM ('CREATION_CHANTIER', 'CHANGEMENT_STATUT', 'AJOUT_PHOTO', 'AFFECTATION_OUVRIER', 'RETRAIT_OUVRIER');

-- CreateTable
CREATE TABLE "action_journal" (
    "id" TEXT NOT NULL,
    "action" "TypeActionJournal" NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_chantier" TEXT NOT NULL,
    "id_auteur" TEXT NOT NULL,

    CONSTRAINT "action_journal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "action_journal" ADD CONSTRAINT "action_journal_id_chantier_fkey" FOREIGN KEY ("id_chantier") REFERENCES "chantiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_journal" ADD CONSTRAINT "action_journal_id_auteur_fkey" FOREIGN KEY ("id_auteur") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
