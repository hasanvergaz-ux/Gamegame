import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Excavator Tractor Sim — Dig, Load & Dump" },
      {
        name: "description",
        content:
          "Drive a tractor, dig with an excavator and haul soil in a tipping dump truck across a 3D farm village.",
      },
      { property: "og:title", content: "Excavator Tractor Sim — Dig, Load & Dump" },
      {
        property: "og:description",
        content: "Dig with the excavator, load the dump truck and tip the soil anywhere you like.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&display=swap",
      },
      { rel: "stylesheet", href: "/game/assets/game.css" },
    ],
  }),
  component: Index,
});

declare global {
  interface Window {
    __gameBooted?: boolean;
  }
}

function Index() {
  useEffect(() => {
    if (window.__gameBooted) return;
    window.__gameBooted = true;

    const sdkScript = document.createElement("script");
    sdkScript.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
    sdkScript.async = true;
    document.head.appendChild(sdkScript);

    const bootGame = () => {
      const gameScript = document.createElement("script");
      gameScript.type = "module";
      gameScript.src = "/game/assets/game.js";
      document.body.appendChild(gameScript);
    };

    const assetMapScript = document.createElement("script");
    assetMapScript.src = "/game/asset-map.js";
    assetMapScript.onload = bootGame;
    assetMapScript.onerror = bootGame;
    document.head.appendChild(assetMapScript);
  }, []);

  return <div id="root" className="fixed inset-0 h-full w-full overflow-hidden" />;
}
