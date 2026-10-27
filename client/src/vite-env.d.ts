/// <reference types="vite/client" />

/** Release constants injected by the `astra-release` plugin (vite.config.ts). */
declare module 'virtual:astra-release' {
  /** Release version: `<major>.<minor>.<commit count>` (bumps every commit). */
  export const APP_VERSION: string;
  /** Short git commit the bundle was built from. */
  export const APP_COMMIT: string;
}
