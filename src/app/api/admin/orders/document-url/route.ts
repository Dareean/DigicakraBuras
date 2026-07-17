import { NextResponse } from "next/server";
import { getDocumentSignedUrl } from "@/lib/storage";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Parameter 'path' wajib diisi" }, { status: 400 });
    }

    // path could contain multiple comma-separated files
    const paths = path.split(",");
    const urls = await Promise.all(
      paths.map(async (p) => {
        try {
          const signedUrl = await getDocumentSignedUrl(p.trim());
          return { path: p, signedUrl };
        } catch (e: any) {
          return { path: p, error: e.message };
        }
      })
    );

    return NextResponse.json({ success: true, urls });
  } catch (error: any) {
    console.error("Gagal mendapatkan signed URL:", error);
    return NextResponse.json({ error: error.message || "Failed to generate signed URL" }, { status: 500 });
  }
}
