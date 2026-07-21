import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/admin/customers/[id]/claim-reward
 *
 * Admin mengklaim reward loyalitas untuk pelanggan.
 *
 * Logic:
 *  - rewardsEarned  = Math.floor(customer.totalStamps / 10)
 *  - rewardsClaimed = count(Stamp where customerId=id AND redeemed=true)
 *  - Jika rewardsEarned > rewardsClaimed → ada reward pending
 *  - Mark satu stamp record (yang paling lama, redeemed=false) menjadi redeemed=true
 *  - Ini menyimbolkan 1 reward telah diberikan kepada pelanggan di toko
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const customerId = Number(id);

    // Fetch customer + stamp counts in one go
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: { stamps: { where: { redeemed: true } } },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
    }

    const rewardsEarned  = Math.floor(customer.totalStamps / 10);
    const rewardsClaimed = customer._count.stamps;

    if (rewardsEarned <= rewardsClaimed) {
      return NextResponse.json(
        { error: "Tidak ada reward yang bisa diklaim untuk pelanggan ini." },
        { status: 400 }
      );
    }

    // Mark satu stamp (tertua, belum diklaim) menjadi redeemed = true
    const stampToMark = await prisma.stamp.findFirst({
      where: { customerId, redeemed: false },
      orderBy: { createdAt: "asc" },
    });

    if (!stampToMark) {
      return NextResponse.json(
        { error: "Tidak ada data stempel yang bisa ditandai." },
        { status: 400 }
      );
    }

    await prisma.stamp.update({
      where: { id: stampToMark.id },
      data: { redeemed: true },
    });

    return NextResponse.json({
      success: true,
      message: `Reward ke-${rewardsClaimed + 1} berhasil diklaim untuk ${customer.name || customer.whatsappNumber}.`,
      rewardsEarned,
      rewardsClaimed: rewardsClaimed + 1,
    });
  } catch (error: any) {
    console.error("[claim-reward] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengklaim reward", details: error.message },
      { status: 500 }
    );
  }
}
