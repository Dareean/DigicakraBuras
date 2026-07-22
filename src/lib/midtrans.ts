let _coreApi: any = null;

export async function getCoreApi() {
  if (!_coreApi) {
    const MidtransClient = await import("midtrans-client").then(
      (m: any) => m.default || m
    );
    const SERVER_KEY = process.env.NEXT_MIDTRANS_SERVER_KEY;
    const CLIENT_KEY = process.env.NEXT_MIDTRANS_CLIENT_KEY;
    const IS_PRODUCTION = process.env.NEXT_MIDTRANS_IS_PRODUCTION === "true";
    if (!SERVER_KEY || !CLIENT_KEY) {
      throw new Error(
        "[Midtrans] NEXT_MIDTRANS_SERVER_KEY dan NEXT_MIDTRANS_CLIENT_KEY harus diisi di .env"
      );
    }
    _coreApi = new MidtransClient.CoreApi({
      isProduction: IS_PRODUCTION,
      serverKey: SERVER_KEY,
      clientKey: CLIENT_KEY,
    });
  }
  return _coreApi;
}

export const midtransConfig = {
  isProduction: process.env.NEXT_MIDTRANS_IS_PRODUCTION === "true",
  clientKey: process.env.NEXT_MIDTRANS_CLIENT_KEY || "",
} as const;
