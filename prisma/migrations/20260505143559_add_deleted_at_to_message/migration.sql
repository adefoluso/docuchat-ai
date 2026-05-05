/*
  Warnings:

  - Added the required column `deletedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "documentId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" TEXT,
    "confidence" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" REAL,
    "latencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("completionTokens", "confidence", "content", "conversationId", "costUsd", "createdAt", "documentId", "id", "latencyMs", "promptTokens", "role", "sources") SELECT "completionTokens", "confidence", "content", "conversationId", "costUsd", "createdAt", "documentId", "id", "latencyMs", "promptTokens", "role", "sources" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_documentId_idx" ON "Message"("documentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
