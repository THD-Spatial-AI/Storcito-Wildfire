/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CARTO_BASEMAP_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Allow importing CSS modules without TS errors
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
