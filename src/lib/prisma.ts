import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Parse and decode connection string if it's a prisma+postgres URL
let connectionString = process.env.DATABASE_URL;

if (connectionString && connectionString.startsWith("prisma+postgres://")) {
  try {
    const urlObj = new URL(connectionString);
    const apiKey = urlObj.searchParams.get("api_key");
    if (apiKey) {
      const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed.databaseUrl) {
        connectionString = parsed.databaseUrl;
      }
    }
  } catch (e) {
    console.error("Failed to parse prisma+postgres URL, falling back to raw URL", e);
  }
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
