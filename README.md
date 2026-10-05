# Strava AI Descriptions

A small Node API deployed on Vercel. Strava sends a webhook when an activity is created; the service fetches that activity, asks Google Gemini to write a description, and sends the description back to Strava. It does not use a database or persist activity data.

## Deploy to Vercel

1. Push this project to a Git provider supported by Vercel.
2. Import the repository in Vercel. If it is part of the `innovation` monorepo, set **Root Directory** to `strava-ai-descriptions`. Vercel detects the existing Next.js Node API automatically.
3. Add the environment variables below in **Project Settings → Environment Variables**.
4. Deploy and assign a stable HTTPS domain.
5. Create a dedicated Strava API application at [strava.com/settings/api](https://www.strava.com/settings/api). Set its Authorization Callback Domain to your Vercel domain (hostname only).
6. Authorize the athlete and obtain tokens as described below, then set the token variables in Vercel and redeploy.
7. Confirm `https://YOUR_DOMAIN/api/health` returns `"status":"ready"`, then register the webhook.

No database, Redis, Docker, or other service is required. For local development, copy `.env.example` to `.env.local`, add the variables, and run `npm install` then `npm run dev`. Strava cannot send webhooks to localhost, so webhook testing requires the public Vercel URL.

## Strava Authorization

Authorize the athlete with `read,activity:read_all,activity:write` scopes. Replace `YOUR_CLIENT_ID` and `YOUR_DOMAIN` in this URL:

```text
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https%3A%2F%2FYOUR_DOMAIN%2F&approval_prompt=force&scope=read%2Cactivity%3Aread_all%2Cactivity%3Awrite
```

After approval, Strava redirects to the root URL with a short-lived `code` query parameter. Exchange the code once:

```powershell
curl.exe -X POST https://www.strava.com/oauth/token `
  -F client_id=YOUR_CLIENT_ID `
  -F client_secret=YOUR_CLIENT_SECRET `
  -F code=YOUR_AUTHORIZATION_CODE `
  -F grant_type=authorization_code
```

Use the response's `access_token`, `expires_at`, `refresh_token`, and `athlete.id` for the corresponding Vercel variables. Keep all credentials private.

## Register the Webhook

Set `STRAVA_VERIFY_TOKEN` to a long random value. Register the callback using the same Strava app credentials:

```powershell
curl.exe -X POST https://www.strava.com/api/v3/push_subscriptions `
  -F client_id=YOUR_CLIENT_ID `
  -F client_secret=YOUR_CLIENT_SECRET `
  -F callback_url=https://YOUR_DOMAIN/api/webhook `
  -F verify_token=YOUR_STRAVA_VERIFY_TOKEN
```

Strava verifies the subscription with `GET /api/webhook`. New activity events are acknowledged and processed after the response. Other athletes, updates, and deletes are ignored. Existing descriptions are left alone unless `OVERWRITE_EXISTING_DESCRIPTIONS=true`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `STRAVA_CLIENT_ID` | Yes | Dedicated Strava app client ID |
| `STRAVA_CLIENT_SECRET` | Yes | Dedicated Strava app secret |
| `STRAVA_ACCESS_TOKEN` | Yes | Current access token used for Strava API calls |
| `STRAVA_ACCESS_TOKEN_EXPIRES_AT` | Yes | Unix expiry timestamp from Strava's `expires_at` response |
| `STRAVA_REFRESH_TOKEN` | Yes | Current refresh token, for manual renewal |
| `STRAVA_ATHLETE_ID` | Yes | Athlete ID from the OAuth response |
| `STRAVA_VERIFY_TOKEN` | Yes | Random token for webhook verification |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `GEMINI_MODEL` | No | Model; defaults to `gemini-2.5-flash` |
| `DESCRIPTION_MAX_CHARS` | No | Maximum final description size, 20 to 1000; defaults to `160` |
| `DESCRIPTION_INSTRUCTIONS` | No | Writing style and constraints sent to Gemini |
| `DESCRIPTION_APPEND_URL` | No | Optional URL appended to descriptions |
| `OVERWRITE_EXISTING_DESCRIPTIONS` | No | Set to `true` to replace descriptions; defaults to `false` |

## Token Renewal

The API intentionally does not persist or rotate tokens. When the access token expires, use the current refresh token to request a new pair:

```powershell
curl.exe -X POST https://www.strava.com/oauth/token `
  -F client_id=YOUR_CLIENT_ID `
  -F client_secret=YOUR_CLIENT_SECRET `
  -F grant_type=refresh_token `
  -F refresh_token=YOUR_CURRENT_REFRESH_TOKEN
```

Update `STRAVA_ACCESS_TOKEN`, `STRAVA_ACCESS_TOKEN_EXPIRES_AT`, and `STRAVA_REFRESH_TOKEN` in Vercel with the response's `access_token`, `expires_at`, and new `refresh_token`, then redeploy. Strava invalidates the previous refresh token when it returns a rotated one, so always replace both tokens together. Until redeployed, the webhook will report token failures. `/api/health` reports `refresh-strava-token` when the configured access token has expired.

## Endpoints and Data

- `GET /` returns service information.
- `GET /api/health` reports configuration and access-token expiry without exposing values.
- `GET /api/webhook` handles Strava subscription verification.
- `POST /api/webhook` handles new activity events.

No database or external storage is used. Activity details are fetched for the request and sent to Gemini for generation; they are not persisted. Vercel environment variables hold the Strava tokens and API credentials. Never expose them in client-side code or commit them to Git.