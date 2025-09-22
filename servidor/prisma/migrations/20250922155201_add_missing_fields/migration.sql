/*
  Warnings:

  - You are about to alter the column `total` on the `Factura` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Factura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreArchivo" TEXT NOT NULL,
    "fechaEmision" TEXT,
    "emisor" TEXT,
    "numeroFactura" TEXT,
    "concepto" TEXT,
    "subtotal" REAL,
    "iva" REAL,
    "total" REAL,
    "moneda" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Factura" ("createdAt", "emisor", "fechaEmision", "id", "nombreArchivo", "total") SELECT "createdAt", "emisor", "fechaEmision", "id", "nombreArchivo", "total" FROM "Factura";
DROP TABLE "Factura";
ALTER TABLE "new_Factura" RENAME TO "Factura";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
