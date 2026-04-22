import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/lib/generated/prisma/client";

declare global {
  var __anicorePrisma: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (!globalThis.__anicorePrisma) {
    const adapter = new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
    });

    globalThis.__anicorePrisma = new PrismaClient({
      adapter,
    });
  }

  return globalThis.__anicorePrisma;
}
