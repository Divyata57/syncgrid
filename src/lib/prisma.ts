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

// Log warning if DATABASE_URL points to localhost in production
if (process.env.NODE_ENV === "production" && connectionString) {
  try {
    const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1") || connectionString.includes("::1");
    if (isLocal) {
      console.error("====================================================================================================");
      console.error("CRITICAL WARNING: DATABASE_URL points to localhost in production! Please configure your cloud database URL in the Render Environment settings.");
      console.error("====================================================================================================");
    }
  } catch (e) {}
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
