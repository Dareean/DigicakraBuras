import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPrintDocument } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const orderIdStr = formData.get("orderId");
    if (!orderIdStr) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }
    const orderId = Number(orderIdStr);

    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Find the print_doc OrderItem for this order
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        orderId: orderId,
        itemType: "print_doc",
      },
    });

    if (!orderItem) {
      return NextResponse.json({ error: "OrderItem not found for print document" }, { status: 404 });
    }

    const fileUrls: string[] = [];
    for (const file of files) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const path = await uploadPrintDocument(buffer, file.name, orderId);
      fileUrls.push(path);
    }

    // Update the OrderItem's fileUrl with the comma-separated storage paths
    await prisma.orderItem.update({
      where: { id: orderItem.id },
      data: {
        fileUrl: fileUrls.join(","),
      },
    });

    return NextResponse.json({ success: true, fileUrls });
  } catch (error: any) {
    console.error("Upload print document failed:", error);
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}
