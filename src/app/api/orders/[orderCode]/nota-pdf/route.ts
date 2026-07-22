import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;
    const url = new URL(request.url);
    const origin = url.origin;
    
    // Redirect to the HTML/CSS printable receipt page
    return NextResponse.redirect(`${origin}/nota/${orderCode}`);
  } catch (error: any) {
    console.error("PDF redirect error:", error);
    return NextResponse.json(
      { error: "Gagal memproses nota" },
      { status: 500 }
    );
  }
}

