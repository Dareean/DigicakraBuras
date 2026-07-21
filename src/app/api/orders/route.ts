import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      whatsappNumber,
      customerName,
      orderSource, // "online" | "pos"
      orderType,   // "print" | "atk" | "mixed"
      pickupNote,
      items,       // array of: { itemType, productId, qty, unitPrice, fileUrl, specJson, addons: [{ addonType, price }] }
      cashierId,   // optional, from POS
      paymentMethod // optional, default "qris"
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Pesanan harus memiliki minimal 1 item" }, { status: 400 });
    }

    // 1. Find or create customer if whatsappNumber is provided
    let customerId: number | null = null;
    if (whatsappNumber) {
      const cleanWa = whatsappNumber.trim();
      const customer = await prisma.customer.upsert({
        where: { whatsappNumber: cleanWa },
        update: { name: customerName || "" },
        create: { whatsappNumber: cleanWa, name: customerName || "" },
      });
      customerId = customer.id;
    }

    // 2. Generate unique order code
    const orderCode = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

    // 3. Calculate totals and construct items
    let totalAmount = 0;

    const orderItemsData = items.map((item: any) => {
      const itemQty = item.qty || 1;
      const itemPrice = item.unitPrice || 0;
      const addonsPrice = item.addons ? item.addons.reduce((sum: number, ad: any) => sum + (ad.price || 0), 0) : 0;
      const subtotal = (itemPrice * itemQty) + addonsPrice; // addons price flat or per item. Let's do flat for binding, etc.
      totalAmount += subtotal;

      return {
        itemType: item.itemType,
        productId: item.productId ? Number(item.productId) : null,
        fileUrl: item.fileUrl || null,
        specJson: JSON.stringify(item.specJson || {}),
        qty: itemQty,
        unitPrice: itemPrice,
        subtotal: subtotal,
        addons: item.addons ? {
          create: item.addons.map((ad: any) => ({
            addonType: ad.addonType,
            price: ad.price,
          })),
        } : undefined,
      };
    });

    // Determine initial order status
    // Online orders: "menunggu_pembayaran"
    // POS orders: if paymentMethod is cash/manual and confirmed, we set to "diterima" or "selesai". Otherwise if QRIS "menunggu_pembayaran"
    let initialStatus = "menunggu_pembayaran";
    if (orderSource === "pos" && (paymentMethod === "cash" || paymentMethod === "manual" || paymentMethod === "qris")) {
      if (orderType === "atk") {
        initialStatus = "selesai"; // POS ATK only is marked completed instantly
      } else {
        initialStatus = "diterima"; // POS Print / Mixed goes to accepted state for printing
      }
    }

    // 4. Create the Order inside a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderCode,
          customerId,
          orderSource: orderSource || "online",
          orderType: orderType || "print",
          status: initialStatus,
          totalAmount,
          pickupNote: pickupNote || "",
          cashierId: cashierId ? Number(cashierId) : null,
          items: {
            create: orderItemsData.map((item: any) => ({
              itemType: item.itemType,
              productId: item.productId,
              fileUrl: item.fileUrl,
              specJson: item.specJson,
              qty: item.qty,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              addons: item.addons,
            })),
          },
        },
        include: {
          items: {
            include: {
              addons: true,
            },
          },
        },
      });

      // Create initial pending Payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: paymentMethod || "qris",
          amount: totalAmount,
          status: (initialStatus === "diterima" || initialStatus === "selesai") ? "success" : "pending",
          paidAt: (initialStatus === "diterima" || initialStatus === "selesai") ? new Date() : null,
        },
      });

      // If POS order (marked paid instantly), deduct inventory and add stamp!
      if (initialStatus === "diterima" || initialStatus === "selesai") {
        // Stock Deduction & Loyalty Stamp logic
        await deductInventoryAndLoyalty(tx, order.id, customerId);
      }

      return order;
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderCode: newOrder.orderCode,
      status: newOrder.status,
      totalAmount: newOrder.totalAmount,
      qrPaymentUrl: `/api/payments/${newOrder.id}/generate-qr`,
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json(
      { error: "Gagal membuat pesanan", details: error.message },
      { status: 500 }
    );
  }
}

// Reusable Stock deduction and loyalty stamp calculation function
export async function deductInventoryAndLoyalty(tx: any, orderId: number, customerId: number | null) {
  // Fetch order items
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          addons: true,
        },
      },
    },
  });

  if (!order) return;

  // 1. Deduct Product Stock for ATK products
  for (const item of order.items) {
    if (item.itemType === "atk" && item.productId) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (product) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: Math.max(0, product.stockQty - item.qty),
          },
        });
      }
    }

    // 2. Deduct Operational Inventory (Paper & Ink) for printing
    if (item.itemType === "print_doc" || item.itemType === "fotokopi") {
      let pages = 1;
      let color = "bw"; // black and white

      try {
        const spec = JSON.parse(item.specJson);
        pages = Number(spec.pages) || 1;
        color = spec.color || "bw";
      } catch (e) {}

      const totalPages = pages * item.qty;

      // Deduct A4 Paper (assuming A4 for all print/copies in this version)
      // 1 rim A4 = 500 sheets.
      // So totalPages sheets is totalPages/500 rim.
      // Let's store sheets in inventory or just deduct sheets.
      // Wait, our inventory seeder defined: Kertas A4 80gr in "rim", with currentQty = 15.
      // 1 sheet = 0.002 rim.
      // To keep it integer and robust, let's treat currentQty as sheets, or let's convert sheets to rim in the inventory log.
      // Let's find "Kertas A4 80gr"
      const paperItem = await tx.inventoryItem.findFirst({
        where: { itemName: { contains: "Kertas A4" } },
      });

      if (paperItem) {
        // If stored as sheets, we just deduct. If stored as rim, we can deduct in sheets if we want, or round up.
        // Let's assume the currentQty in DB represents "lembar" (sheets) or let's deduct 1 rim per 500 pages.
        // Wait, the seeder created Kertas A4 80gr with currentQty: 15 (rim).
        // Let's deduct from the rim count: (totalPages / 500). Let's represent logs as fractional or decrement rim.
        // If we want sheets, let's say: we decrement currentQty by 1 rim when cumulative pages reach 500.
        // For simplicity of a mock dashboard, let's decrement currentQty by 1 rim for every print order, or make the decrement proportional.
        // Let's do: if currentQty > 0, decrement by 1 if totalPages > 100, or just decrement pages.
        // Let's look at the seeder: currentQty is 15 rim. Let's subtract a fractional amount or keep it simple:
        // Let's subtract 1 rim if totalPages > 250, else just 0. Or we can represent inventory items in sheets/pieces.
        // To be precise and visually clear in the dashboard:
        // Let's update `currentQty` by subtracting pages/500 (rounded) or at least 1 unit if currentQty is high.
        // Let's do:
        const paperDeduction = Math.max(1, Math.round(totalPages / 500));
        await tx.inventoryItem.update({
          where: { id: paperItem.id },
          data: { currentQty: Math.max(0, paperItem.currentQty - paperDeduction) },
        });

        await tx.inventoryLog.create({
          data: {
            inventoryItemId: paperItem.id,
            changeQty: -paperDeduction,
            reason: `Order #${order.orderCode} (${totalPages} hal)`,
          },
        });
      }

      // Deduct Ink
      const inkName = color === "color" ? "Tinta Printer Warna" : "Tinta Printer Hitam";
      const inkItem = await tx.inventoryItem.findFirst({
        where: { itemName: { contains: inkName } },
      });

      if (inkItem) {
        // Assume 1 bottle prints 5000 pages. Proportional deduction or 1 bottle per 5000 pages.
        // For visual change, let's deduct 1 bottle if totalPages > 1000, or just deduct 1 unit occasionally,
        // or just decrement by 1 bottle for demo if it prints. Let's do a logic:
        const inkDeduction = Math.max(1, Math.round(totalPages / 1000));
        await tx.inventoryItem.update({
          where: { id: inkItem.id },
          data: { currentQty: Math.max(0, inkItem.currentQty - inkDeduction) },
        });

        await tx.inventoryLog.create({
          data: {
            inventoryItemId: inkItem.id,
            changeQty: -inkDeduction,
            reason: `Order #${order.orderCode} (${totalPages} hal)`,
          },
        });
      }
    }
  }

  // 3. Loyalty Stamp Program
  // Rules: 1 stamp per order. If customer ID exists, we increment their totalStamps,
  // and record a stamp transaction.
  // Reward tracking: rewardsEarned = Math.floor(totalStamps / 10)
  //                  rewardsClaimed = count of Stamp records where redeemed = true
  // When rewardsEarned > rewardsClaimed → ada reward yang belum diklaim.
  // Admin mengklaim reward via /api/admin/customers/[id]/claim-reward
  // yang akan meng-update satu stamp record menjadi redeemed = true.
  if (customerId) {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
    });

    if (customer) {
      const newStampsCount = customer.totalStamps + 1;
      await tx.customer.update({
        where: { id: customerId },
        data: { totalStamps: newStampsCount },
      });

      await tx.stamp.create({
        data: {
          customerId,
          orderId,
          stampCount: 1,
          redeemed: false, // selalu false saat dibuat; admin yang mengubah ke true saat klaim
        },
      });
    }
  }
}
