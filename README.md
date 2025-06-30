# Breslev Torah Online

This project contains the source code for **Le Compagnon du Cœur**, an interactive study guide for the teachings of Rabbi Nahman of Breslov.

## Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Configure the required environment variables.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | API key used by the server and client to access Gemini AI. |
| `DATABASE_URL` | PostgreSQL connection string for the database. |
| `GOOGLE_TTS_CREDENTIALS_B64` | Base64 encoded Google Cloud Text‑to‑Speech credentials (optional). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service account JSON file if the base64 variable is not used. |
| `PORT` | Port for the Express server (defaults to `5000`). |

The server exposes `VITE_GEMINI_API_KEY` to the client automatically from `GEMINI_API_KEY`.

## Development

Run the development server with hot reload:
```bash
npm run dev
```

## Building

Create a production build of the client and server:
```bash
npm run build
```

Start the built application with:
```bash
npm start
```

## Tests

Two npm scripts help verify the project:

- `npm run check` — run the TypeScript compiler for type checking.
- `npm run test:api` — build the project and run basic API tests.

