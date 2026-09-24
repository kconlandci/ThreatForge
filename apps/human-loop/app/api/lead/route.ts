import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ stored: false }, { status: 202 });
}
