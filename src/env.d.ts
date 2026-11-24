/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_REPORTS_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
