import { createFileRoute } from "@tanstack/react-router";

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
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/game/index.html"
      title="Excavator Tractor Sim"
      className="fixed inset-0 h-full w-full border-0"
      allow="autoplay; fullscreen; gamepad"
      allowFullScreen
    />
  );
}
