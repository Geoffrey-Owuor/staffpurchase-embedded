const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// A .js manifest (not .json) so the icon paths can carry basePath - Next
// prefixes the <link rel="manifest"> itself, but not the URLs inside it.
export default function manifest() {
  return {
    name: "Hotpoint",
    short_name: "Hotpoint",
    icons: [
      {
        src: `${basePath}/web-app-manifest-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${basePath}/web-app-manifest-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };
}
