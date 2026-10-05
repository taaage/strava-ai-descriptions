import { NextResponse } from "next/server";

export function GET() {
  const stravaConfigured = Boolean(
    process.env.STRAVA_CLIENT_ID &&
      process.env.STRAVA_CLIENT_SECRET &&
      process.env.STRAVA_ACCESS_TOKEN &&
      process.env.STRAVA_REFRESH_TOKEN &&
      process.env.STRAVA_ATHLETE_ID &&
      process.env.STRAVA_VERIFY_TOKEN,
  );
  const accessTokenExpiresAt = Number(process.env.STRAVA_ACCESS_TOKEN_EXPIRES_AT);
  const stravaTokenValid = Boolean(
    process.env.STRAVA_ACCESS_TOKEN &&
      Number.isFinite(accessTokenExpiresAt) &&
      accessTokenExpiresAt > Math.floor(Date.now() / 1000),
  );
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const configured = stravaConfigured && stravaTokenValid && geminiConfigured;

  return NextResponse.json({
    status: configured
      ? "ready"
      : stravaConfigured && !stravaTokenValid
        ? "refresh-strava-token"
        : "needs-configuration",
    stravaConfigured,
    stravaTokenValid,
    geminiConfigured,
  });
}