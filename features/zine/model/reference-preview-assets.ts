const svgDataUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

export const referencePreviewAssets = {
  landscape: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9">
      <defs><linearGradient id="g" x1="0" x2="1" y1="1" y2="0"><stop stop-color="#173b4d"/><stop offset=".5" stop-color="#d7664c"/><stop offset="1" stop-color="#f3c879"/></linearGradient></defs>
      <rect width="16" height="9" fill="url(#g)"/><circle cx="12.3" cy="2.1" r="1.05" fill="#fff1c8" opacity=".9"/><path d="M0 6.6 3.2 4.5l2.2 1.2 2.7-2.2 3.4 2.2 2.3-1.1L16 6.1V9H0Z" fill="#f1b36b" opacity=".78"/><path d="M0 7.5 4.7 5.9 8 7.1l3.4-1.7L16 7.9V9H0Z" fill="#17445c" opacity=".84"/>
    </svg>
  `),
  portrait: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 16">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f1c76e"/><stop offset=".45" stop-color="#b34b56"/><stop offset="1" stop-color="#282a58"/></linearGradient></defs>
      <rect width="9" height="16" fill="url(#g)"/><circle cx="2.2" cy="3" r="1.3" fill="#fff4cf" opacity=".82"/><path d="M0 10.4 2.1 7.6l1.4 1.2 1.7-3 1.2 1.4L9 5.7V16H0Z" fill="#f5df99" opacity=".7"/><path d="M0 12.2 3 10.4l1.5 1 2.2-2 2.3 1.3V16H0Z" fill="#272751" opacity=".86"/>
    </svg>
  `),
  square: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
      <defs><radialGradient id="g"><stop stop-color="#f4df9d"/><stop offset=".5" stop-color="#e76f51"/><stop offset="1" stop-color="#2b3d65"/></radialGradient></defs>
      <rect width="12" height="12" fill="url(#g)"/><circle cx="6" cy="6" r="2.05" fill="none" stroke="#fff8df" stroke-width=".35" opacity=".9"/><path d="M0 9 2.2 7.5 4 8.6l2-2.2 2.4 1.3L12 6.2V12H0Z" fill="#294c5b" opacity=".77"/>
    </svg>
  `),
  ultraWide: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 7">
      <defs><linearGradient id="g"><stop stop-color="#203c59"/><stop offset=".48" stop-color="#6eb7a5"/><stop offset="1" stop-color="#f1b95f"/></linearGradient></defs>
      <rect width="24" height="7" fill="url(#g)"/><path d="M0 5.2 3.1 3.6l2.8.8 3.4-2 4.1 2.2 3.6-1.8 3.1 1.2L24 2.8V7H0Z" fill="#173e4d" opacity=".82"/><circle cx="19.6" cy="1.5" r=".8" fill="#fff2c4"/>
    </svg>
  `),
  color: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
      <rect width="12" height="12" fill="#142f45"/><circle cx="3" cy="3" r="2.2" fill="#ef6b55"/><circle cx="9" cy="3" r="2.2" fill="#f2c14e"/><circle cx="3" cy="9" r="2.2" fill="#58b09c"/><circle cx="9" cy="9" r="2.2" fill="#8e72c7"/><path d="M0 6h12M6 0v12" stroke="#fff4d6" stroke-width=".18" opacity=".8"/>
    </svg>
  `),
} as const;

export type ReferencePreviewAssetId = keyof typeof referencePreviewAssets;
