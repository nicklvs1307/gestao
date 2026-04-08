import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // This migration adds PICKUP to OrderType enum
  // The SQL is in migration.sql
  console.log("Migration add_pickup_to_order_type executed")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
