import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "strava-ai-descriptions",
    status: "online",
    health: "/api/health",
    webhook: "/api/webhook",
  });
}