import { NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/storage";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "owner") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadProductImage(buffer, file.name, file.type);

    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (error: any) {
    console.error("Upload product image failed:", error);
    return NextResponse.json({ error: error.message || "Failed to upload image" }, { status: 500 });
  }
}
