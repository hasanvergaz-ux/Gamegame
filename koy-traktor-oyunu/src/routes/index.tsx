import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Game = lazy(() => import("@/game/Game"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Köy Traktör Simülatörü — Kazayağı ile tarla sür" },
      {
        name: "description",
        content: "Gerçekçi köy haritasında traktör sür: hidrolik kaldırıcıyı indir, kazayağını tak ve tarlayı işle. Çukurlar, çamur, köy evleri ve buğday tarlaları.",
      },
      { property: "og:title", content: "Köy Traktör Simülatörü" },
      { property: "og:description", content: "Traktöre kazayağı tak, kaldırıcıyı indir ve gerçekçi bir köy haritasında toprağı işle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Suspense fallback={<div className="game-root" />}>
      <Game />
    </Suspense>
  );
}
