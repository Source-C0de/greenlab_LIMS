/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "true" to switch the app from mock-data to the backend. */
  readonly VITE_USE_API?: string;
  /** Absolute origin in prod, e.g. "https://api.example.com/api/v1". Empty in dev uses the Vite /api proxy. */
  readonly VITE_API_BASE_URL?: string;
  /** Bearer token sent as Authorization header when set. */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
