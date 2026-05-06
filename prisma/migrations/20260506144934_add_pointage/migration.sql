-- CreateTable
CREATE TABLE "pointages" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "duree" DOUBLE PRECISION NOT NULL,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_chantier" TEXT NOT NULL,
    "id_utilisateur" TEXT NOT NULL,

    CONSTRAINT "pointages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_id_chantier_fkey" FOREIGN KEY ("id_chantier") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
