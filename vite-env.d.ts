/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VERCEL: string;
  readonly VITE_API_BASE_URL: string;
  // Add other VITE_* environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}