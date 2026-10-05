export function getStravaAccessToken(): string {
  const accessToken = process.env.STRAVA_ACCESS_TOKEN?.trim();
  const expiresAt = Number(process.env.STRAVA_ACCESS_TOKEN_EXPIRES_AT);
  if (!accessToken || !Number.isFinite(expiresAt)) {
    throw new Error("Strava access token or expiry is not configured");
  }
  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("Strava access token expired; update the Vercel token variables and redeploy");
  }
  return accessToken;
}