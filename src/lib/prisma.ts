import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

let prisma: PrismaClient

if (process.env.NODE_ENV === "production" || process.env.NEXT_RUNTIME === "edge" || typeof (globalThis as any).EdgeRuntime !== "undefined") {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  prisma = new PrismaClient({ adapter })
} else {
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  prisma = globalForPrisma.prisma ?? new PrismaClient()
  globalForPrisma.prisma = prisma
}

export { prisma }

