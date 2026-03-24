import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "nexa-core",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
