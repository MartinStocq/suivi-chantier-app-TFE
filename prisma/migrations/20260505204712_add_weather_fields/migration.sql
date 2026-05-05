-- AlterTable
ALTER TABLE "adresses" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "meteo_snapshots" ALTER COLUMN "date_snapshot" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "date_snapshot" SET DATA TYPE TIMESTAMP(3);
