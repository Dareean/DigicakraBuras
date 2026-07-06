import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.stamp.deleteMany();
  await prisma.note.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderAddon.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.taxSettings.deleteMany();
  await prisma.taxReport.deleteMany();

  // 1. Create Admins
  const ownerPasswordHash = await bcrypt.hash("owner123", 10);
  const staffPasswordHash = await bcrypt.hash("staff123", 10);

  const owner = await prisma.admin.create({
    data: {
      name: "Bu Herlina",
      email: "owner@cakrawala.id",
      passwordHash: ownerPasswordHash,
      role: "owner",
    },
  });

  const staff = await prisma.admin.create({
    data: {
      name: "Staff Kasir",
      email: "staff@cakrawala.id",
      passwordHash: staffPasswordHash,
      role: "staff",
    },
  });

  console.log("Admins created: Owner (owner@cakrawala.id) & Staff (staff@cakrawala.id)");

  // 2. Create ATK Products
  const products = [
    {
      name: "Buku Tulis Kiky A5",
      description: "Buku tulis Kiky ukuran A5 isi 38 lembar",
      price: 6500,
      stockQty: 50,
      category: "Alat Tulis",
      isActive: true,
    },
    {
      name: "Pulpen Standard AE7 Black",
      description: "Pulpen tinta hitam Standard AE7",
      price: 3000,
      stockQty: 100,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Pensil 2B Faber-Castell",
      description: "Pensil Faber-Castell 2B asli untuk ujian",
      price: 4000,
      stockQty: 80,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Penghapus Joyko EB-30",
      description: "Penghapus karet Joyko super bersih",
      price: 1500,
      stockQty: 60,
      category: "Penghapus & Koreksi",
      isActive: true,
    },
    {
      name: "Penggaris Butterfly 30cm",
      description: "Penggaris plastik transparan 30cm",
      price: 5000,
      stockQty: 30,
      category: "Penggaris & Pengukur",
      isActive: true,
    },
  ];

  for (const prod of products) {
    await prisma.product.create({ data: prod });
  }

  console.log("ATK Products created.");

  // 3. Create Operational Inventory Items
  const inventoryItems = [
    {
      itemName: "Kertas A4 80gr",
      unit: "rim",
      currentQty: 15,
      minThreshold: 3,
    },
    {
      itemName: "Tinta Printer Hitam",
      unit: "botol",
      currentQty: 5,
      minThreshold: 2,
    },
    {
      itemName: "Tinta Printer Warna",
      unit: "botol",
      currentQty: 4,
      minThreshold: 2,
    },
    {
      itemName: "Plastik Laminating A4",
      unit: "pack",
      currentQty: 3,
      minThreshold: 1,
    },
  ];

  for (const inv of inventoryItems) {
    const item = await prisma.inventoryItem.create({ data: inv });
    
    // Seed initial inventory log
    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: item.id,
        changeQty: inv.currentQty,
        reason: "Stok awal seeder",
      },
    });
  }

  console.log("Operational Inventory Items created.");

  // 4. Create Tax Settings
  await prisma.taxSettings.create({
    data: {
      taxType: "ppn",
      ratePercent: 11.0,
      effectiveFrom: new Date(),
      isActive: true,
    },
  });

  await prisma.taxSettings.create({
    data: {
      taxType: "pph",
      ratePercent: 0.5,
      effectiveFrom: new Date(),
      isActive: true,
    },
  });

  console.log("Tax settings created: PPN (11%) & PPh (0.5%).");

  // 5. Create some dummy customers and completed orders to populate dashboards
  const customer = await prisma.customer.create({
    data: {
      whatsappNumber: "081234567890",
      name: "Daren",
      totalStamps: 3,
    },
  });

  console.log("Sample customer created.");

  console.log("Database seed finished!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
