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
      name: "Pulpen Faster C600 Hitam",
      description: "Pulpen tinta Faster C600 menulis sangat lancar dan awet",
      imageUrl: "/assets/katalog/Pulpen Faster C600.jpeg",
      price: 3500,
      stockQty: 80,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Pulpen Snowman V-1 Hitam",
      description: "Pulpen tinta hitam Snowman V-1 semi-gel berkualitas tinggi",
      imageUrl: "/assets/katalog/Pulpen Snowman V-1 Hitam.jpg",
      price: 4000,
      stockQty: 100,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Pulpen Gel Joyko GP-265 Shokyo",
      description: "Pulpen gel Joyko GP-265 Shokyo hitam, mata pena 0.5 mm sangat tajam",
      imageUrl: "",
      price: 5000,
      stockQty: 45,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Pensil 2B Faber-Castell",
      description: "Pensil kayu 2B original Faber-Castell Castell 9000 untuk ujian nasional",
      imageUrl: "",
      price: 6000,
      stockQty: 90,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Pensil Mekanik Joyko MP-01 0.5mm",
      description: "Pensil mekanik Joyko ukuran 0.5 mm, praktis tidak perlu diraut",
      imageUrl: "",
      price: 7500,
      stockQty: 35,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Penghapus Joyko EB-30 Hitam",
      description: "Penghapus karet Joyko EB-30 hitam, bersih menghapus dan bebas debu",
      imageUrl: "",
      price: 2000,
      stockQty: 120,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Rautan Faber-Castell Sleek",
      description: "Rautan pensil Faber-Castell praktis dengan wadah penampung sampah serutan",
      imageUrl: "",
      price: 5000,
      stockQty: 25,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Spidol Snowman Boardmarker Hitam",
      description: "Spidol papan tulis putih Snowman Boardmarker BG-12, mudah dihapus",
      imageUrl: "",
      price: 10000,
      stockQty: 50,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Spidol Snowman Permanen Hitam",
      description: "Spidol permanen Snowman F-10, tahan air dan tidak mudah luntur",
      imageUrl: "",
      price: 8500,
      stockQty: 60,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Stabilo Boss Original Kuning",
      description: "Penanda kalimat Stabilo Boss Original warna kuning terang legendaris",
      imageUrl: "",
      price: 12500,
      stockQty: 30,
      category: "Pena & Pensil",
      isActive: true,
    },
    {
      name: "Buku Tulis Pendek SIDU 38 lembar",
      description: "Buku tulis pendek Sinar Dunia (SIDU) isi 38 lembar, kertas putih halus",
      imageUrl: "/assets/katalog/Buku Tulis pendek merk SIDU 38 lembar.png",
      price: 4500,
      stockQty: 120,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Buku Tulis Campus KIKY 40 lembar",
      description: "Buku tulis Campus KIKY isi 40 lembar berkualitas kertas premium tebal",
      imageUrl: "/assets/katalog/Buku Tulis Campus merk KIKY 40 lembar.jpeg",
      price: 7500,
      stockQty: 85,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Buku Album Paperline Quarto 100 lembar",
      description: "Buku Album Hardcover Paperline Ukuran Quarto 100 lembar sampul motif batik",
      imageUrl: "/assets/katalog/Buku Album Paperline Ukuran Quarto 100 lembar.jpeg",
      price: 15000,
      stockQty: 40,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Buku Album Paperline Folio 100 lembar",
      description: "Buku Album Hardcover Paperline Ukuran Folio 100 lembar sampul motif batik tebal",
      imageUrl: "/assets/katalog/Buku Album Paperline ukuran folio 100 lembar.jpeg",
      price: 22000,
      stockQty: 30,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Binder Note Joyko A5",
      description: "Binder Note plastik Joyko ukuran A5 lengkap dengan kertas loose leaf",
      imageUrl: "",
      price: 25000,
      stockQty: 20,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Kertas HVS PaperOne A4 80gr 1 Rim",
      description: "Kertas cetak HVS PaperOne ukuran A4 ketebalan 80 gram isi 500 lembar",
      imageUrl: "",
      price: 55000,
      stockQty: 15,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Kertas HVS PaperOne F4/Folio 80gr 1 Rim",
      description: "Kertas cetak HVS PaperOne ukuran F4/Folio ketebalan 80 gram isi 500 lembar",
      imageUrl: "",
      price: 60000,
      stockQty: 10,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Sticky Notes Joyko 3x3 Kuning",
      description: "Kertas memo tempel Joyko ukuran 3x3 inci warna kuning neon isi 100 lembar",
      imageUrl: "",
      price: 8000,
      stockQty: 40,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Map L Plastik Transparan A4",
      description: "Map plastik bentuk L transparan ukuran A4 pelindung dokumen praktis",
      imageUrl: "",
      price: 3000,
      stockQty: 200,
      category: "Map & Penyimpanan",
      isActive: true,
    },
    {
      name: "Map Snelhechter Plastik F4",
      description: "Map snelhechter plastik F4 dengan jepitan besi di bagian tengah",
      imageUrl: "",
      price: 4500,
      stockQty: 75,
      category: "Map & Penyimpanan",
      isActive: true,
    },
    {
      name: "Map Dokumen Kancing Joyko F4",
      description: "Map plastik berkancing merk Joyko ukuran F4 penyimpan dokumen aman",
      imageUrl: "",
      price: 5500,
      stockQty: 90,
      category: "Map & Penyimpanan",
      isActive: true,
    },
    {
      name: "Binder Clip Joyko 105",
      description: "Penjepit kertas Binder Clip Joyko No. 105 isi 12 pcs per kotak kecil",
      imageUrl: "",
      price: 2500,
      stockQty: 150,
      category: "Map & Penyimpanan",
      isActive: true,
    },
    {
      name: "Amplop Putih Paperline No. 104",
      description: "Amplop surat putih Paperline ukuran No. 104 dengan seal lem isi 100 lembar",
      imageUrl: "",
      price: 18000,
      stockQty: 20,
      category: "Buku & Kertas",
      isActive: true,
    },
    {
      name: "Tinta Printer Epson 003 Hitam",
      description: "Tinta printer Epson 003 original hitam untuk seri L1110, L3110, L3150, L5190",
      imageUrl: "",
      price: 85000,
      stockQty: 12,
      category: "Tinta & Peralatan Kantor",
      isActive: true,
    },
    {
      name: "Tinta Printer Canon GI-790 Hitam",
      description: "Tinta printer Canon GI-790 original hitam untuk seri G1010, G2010, G3010",
      imageUrl: "",
      price: 95000,
      stockQty: 8,
      category: "Tinta & Peralatan Kantor",
      isActive: true,
    },
    {
      name: "Penggaris Besi Joyko 30cm",
      description: "Penggaris besi stainless steel Joyko panjang 30 cm presisi dan kuat",
      imageUrl: "",
      price: 6500,
      stockQty: 40,
      category: "Tinta & Peralatan Kantor",
      isActive: true,
    },
    {
      name: "Gunting Kantor Joyko SC-828",
      description: "Gunting serbaguna Joyko SC-828 stainless steel tajam dan gagang nyaman",
      imageUrl: "",
      price: 8000,
      stockQty: 30,
      category: "Tinta & Peralatan Kantor",
      isActive: true,
    },
    {
      name: "Stapler Joyko HD-10 + Anak Staples",
      description: "Paket Stapler Joyko HD-10 kecil beserta 1 kotak anak staples No. 10",
      imageUrl: "",
      price: 12000,
      stockQty: 50,
      category: "Tinta & Peralatan Kantor",
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
