# Strava AI Descriptions

A self-hosted API that turns Strava activity metrics into configurable activity descriptions with Google Gemini. It does not register a Strava webhook, store activity data, or handle Strava tokens. Your existing Strava integration remains responsible for receiving events and writing descriptions back to Strava.

Each operator deploys their own instance and supplies their own Gemini key, service key, writing instructions, and length limit.

## Quick Start

### 1. Get a Gemini API key

Create a key in [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Configure the service

```powershell
Copy-Item .env.example .env.local
```

Set `GEMINI_API_KEY` and create a long random `AI_DESCRIPTIONS_SERVICE_KEY`. The same service key will be configured in the app that calls this API. Keep both values server-side and never commit `.env.local`.

Generate a service key locally with Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### 3. Run locally

Requires Node.js 20.9 or later.

```powershell
npm install
npm run dev
```

The API is available at `http://localhost:3000`. Check configuration with `GET /api/health`.

### 4. Host it

The service can be deployed to Vercel or any host that supports Next.js:

1. Import the `strava-ai-descriptions` repository into your host.
2. Add the environment variables below to the production environment.
3. Deploy, then copy the service URL and `AI_DESCRIPTIONS_SERVICE_KEY` into your webhook backend.

For Vercel, the framework is detected automatically. Set the environment variables before deploying and redeploy whenever they change.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes | | Gemini API key used for generation |
| `AI_DESCRIPTIONS_SERVICE_KEY` | Yes | | Bearer key required by `POST /api/describe` |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `DESCRIPTION_MAX_CHARS` | No | `160` | Maximum final description length, from 20 to 1000 characters |
| `DESCRIPTION_INSTRUCTIONS` | No | Concise cycling description | Your preferred tone and writing rules |
| `DESCRIPTION_APPEND_URL` | No | | Optional URL appended after the generated text |

Environment changes require a service restart or redeploy. `DESCRIPTION_APPEND_URL`, including its separator, counts toward the maximum length.

## API

### `POST /api/describe`

Authenticated server-to-server endpoint. Send only activity metrics needed to write the description; do not send Strava access or refresh tokens.

```http
POST /api/describe
Authorization: Bearer YOUR_AI_DESCRIPTIONS_SERVICE_KEY
Content-Type: application/json
```

```json
{
  "activity": {
    "name": "Evening ride",
    "type": "Ride",
    "sport_type": "Ride",
    "distance": 24600,
    "moving_time": 3900,
    "average_speed": 6.3,
    "total_elevation_gain": 220,
    "average_watts": 184,
    "average_heartrate": 146
  }
}
```

Success response:

```json
{ "description": "A steady evening effort: 24.6 km, 220 m climbed, and 184 W average." }
```

The endpoint returns `401` for an invalid key, `400` for malformed activity data, `503` when server configuration is missing, and `502` when generation fails. `GET /api/health` reports whether required settings are present without exposing their values.

### Test the endpoint in PowerShell

```powershell
$body = @{
  activity = @{
    name = "Evening ride"
    type = "Ride"
    distance = 24600
    moving_time = 3900
    average_speed = 6.3
    total_elevation_gain = 220
  }
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/describe" `
  -Headers @{ Authorization = "Bearer YOUR_LOCAL_SERVICE_KEY" } `
  -ContentType "application/json" `
  -Body $body
```

## Connect `strava-api`

The existing `strava-api` webhook remains the Strava callback and continues syncing the dashboard. On `activity.create`, it schedules a post-response task that sends only the activity name, type, distance, duration, speed, elevation, average power, and average heart rate to this service. It then writes the returned description to Strava using its existing access token and updates its activity cache. Strava credentials never leave `strava-api`.

The Strava authorization used by the webhook must have the `activity:write` scope to update activity descriptions. This service does not request or manage Strava scopes.

Set these variables in the `strava-api` deployment:

```env
AI_DESCRIPTIONS_URL=https://YOUR-SERVICE.example.com
AI_DESCRIPTIONS_SERVICE_KEY=the-same-key-configured-in-the-description-service
AI_DESCRIPTIONS_OVERWRITE_EXISTING=false
```

The service key must match `AI_DESCRIPTIONS_SERVICE_KEY` in both deployments. Existing activity descriptions are preserved by default. Set `AI_DESCRIPTIONS_OVERWRITE_EXISTING=true` only if you want new-activity events to replace them. If generation or the Strava update fails, dashboard syncing continues and the error is logged by `strava-api`.

There is no need to register a second Strava webhook for this integration.

## Privacy and Security

- Keep Gemini and service keys in server-side environment variables.
- Use HTTPS for hosted deployments and a unique service key per installation.
- The service sends only the selected activity metrics to Gemini and does not persist request payloads.
- The API is designed for a self-hosted instance, not a shared multi-user service. Each operator controls their own deployment and provider credentials.