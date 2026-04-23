import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      results: [],
      error: "Search now runs in the browser.",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
