import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Hanya Owner yang dapat merubah konfigurasi tarif pajak" }, { status: 403 });
    }

    const body = await request.json();
    const { taxType, ratePercent } = body;

    if (!taxType || ratePercent === undefined) {
      return NextResponse.json({ error: "Kolom jenis pajak (ppn/pph) dan persentase tarif wajib diisi" }, { status: 400 });
    }

    if (taxType !== "ppn" && taxType !== "pph") {
      return NextResponse.json({ error: "Jenis pajak tidak valid. Harus 'ppn' atau 'pph'" }, { status: 400 });
    }

    // Set other settings for this type to inactive, or just update the existing active setting
    const activeSetting = await prisma.taxSettings.findFirst({
      where: { taxType, isActive: true },
    });

    let updated;
    if (activeSetting) {
      updated = await prisma.taxSettings.update({
        where: { id: activeSetting.id },
        data: {
          ratePercent: Number(ratePercent),
          effectiveFrom: new Date(),
        },
      });
    } else {
      updated = await prisma.taxSettings.create({
        data: {
          taxType,
          ratePercent: Number(ratePercent),
          effectiveFrom: new Date(),
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true, setting: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memperbarui tarif pajak", details: error.message },
      { status: 500 }
    );
  }
}
