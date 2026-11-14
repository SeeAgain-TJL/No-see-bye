import { NextResponse } from "next/server";
import { configuredProviders } from "@/core/oauth";
export async function GET() { return NextResponse.json({ providers: configuredProviders() }, { headers: { "Cache-Control": "no-store" } }); }
