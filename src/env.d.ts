/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SIM_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
