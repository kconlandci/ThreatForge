import type { MetadataRoute } from "next";

/** "Add to Home Screen": the game opens full screen from a phone's home screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Human Loop",
    short_name: "Human Loop",
    description: "A free game by DCI Resources: check an AI coworker's plan before it runs.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
