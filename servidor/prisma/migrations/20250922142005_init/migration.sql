-- CreateTable
CREATE TABLE "Factura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreArchivo" TEXT NOT NULL,
    "fechaEmision" TEXT,
    "emisor" TEXT,
    "total" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
