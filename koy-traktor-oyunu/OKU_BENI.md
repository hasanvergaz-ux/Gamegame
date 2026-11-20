# Köy Traktör Oyunu

Tarayıcıda çalışan 3D traktör oyunu: gerçekçi dokulu köy haritası, arka kaldırıcı (3 nokta askı) ve kazayağı ile toprak işleme, çamurlu çukurlar, gece/gündüz, motor sesi ve ağır korna.

## Çalıştırma

Bilgisayarında [Node.js](https://nodejs.org) (20 veya üstü) ya da [Bun](https://bun.sh) kurulu olmalı.

```bash
npm install      # veya: bun install
npm run dev      # veya: bun run dev
```

Sonra terminalde yazan adresi (genelde http://localhost:8080 veya http://localhost:3000) tarayıcıda aç.

Testleri çalıştırmak için: `npm test`

## Kontroller

| Tuş | İş |
| --- | --- |
| K | Kontak (motoru çalıştır / durdur) |
| W / S (veya ↑ / ↓, Boşluk) | Gaz / fren |
| A / D (veya ← / →) | Direksiyon |
| R | İleri ⇄ geri vites |
| E / Q | Arka kolları kaldır / indir |
| T | Aleti tak / çıkar |
| H | Korna |
| C | Kamera değiştir |
| L / J / B | Far / iş lambası / çakar |
| N | Gece ⇄ gündüz |
| O | Kaputu aç / kapat |
| F1 | Tuş listesi |

Telefonda ekrandaki düğmeler kullanılır.

## Klasörler (başka bir yapay zekaya anlatırken işine yarar)

- `src/game/sim/` – Oyunun kuralları: harita ve arazi yüksekliği (`world.ts`), traktör fiziği (`tractor.ts`), arka askı ve kazayağı ölçüleri (`hitch.ts`), sürülmüş toprak haritası (`field.ts`). Testleri: `tractor.test.ts`.
- `src/game/scene/` – Ekranda çizilenler: arazi, bitkiler, evler, traktör, kazayağı, toz/duman.
- `src/game/audio/GameAudio.ts` – Motor, korna, hidrolik ve toprak sesleri.
- `src/game/ui/` – Gösterge paneli, düğmeler, mini harita.
- `src/game/Game.tsx` – Her kareyi yöneten ana döngü, kamera, ışık ve gece/gündüz.
- `public/game-assets/` – Traktör modeli, dokular, bitki görselleri ve motor sesleri.

Kullanılan teknolojiler: React 19, TanStack Start, Vite, Three.js, React Three Fiber, Tailwind CSS.
Dokular Poly Haven'dan (CC0, serbest kullanım). Traktör modeli ve motor sesi senin yüklediğin orijinal oyundan.

## Kepçe (mini ekskavatör)
- Araç değiştir: ekrandaki **⇄ Kepçeye geç / Traktöre geç** düğmesi ya da **V**.
- Sürüş: W/S ileri-geri, A/D dönüş. Kule ← →, bom ↑ ↓, arm E/Q, kova Z/X, bıçak G, kontak K.
- **Boşluk / OTOMATİK KAZ**: kepçe önündeki toprağı kazar, sola döker; her geçişte çukur derinleşir.
- Yollar ve bina zeminleri dışında haritadaki tüm toprak kazılabilir; dökülen toprak yığın olur ve traktörle üzerinden geçilebilir.

## Çakır Hafriyat İş Merkezi (şantiye)
- Köyün kuzey-batısında, ana yoldan ayrılan toprak yolun sonunda çitli bir şantiye alanı. Girişte **ÇAKIR HAFRİYAT – İŞ MERKEZİ** yazılı kapı kemeri var.
- **İş Merkezi binası** (2 katlı, çatı tabelası "ÇAKIR HAFRİYAT"), yanında **Köy Çalışma Bürosu** (kiremit çatılı, ilan panosu), bayrak direği, motorin tankı, toprak yığınları ve aydınlatma direkleri.
- Kepçe ve damperli kamyon oyuna şantiyede park halinde başlar. Minimap'te şantiye sarı çerçeveli görünür.
- **ÇAKIR HAFRİYAT** yazısı traktörün kaputunda, kepçenin iki yanında, kamyonun kapılarında, kasasında ve arka kapağında var.

## Mercedes-Benz damperli kamyon (Actros 8x4)
- Araç değiştir: **V** (Traktör → Kepçe → Kamyon) ya da adreste `?arac=kamyon`.
- Sürüş: W/S gaz-fren, A/D direksiyon, R ileri/geri vites, K kontak, **E damperi kaldır, Q indir**, H korna, L far, B çakar, C kamera.
- Yükleme: kamyonu kepçenin **sol yanına**, yan yana park et (aralarında yaklaşık 1,5 m) ve kepçede **Boşluk** ile otomatik kazıyı başlat; toprak doğrudan kasaya dolar (kapasite 8 m³).
- Boşaltma: motor çalışırken damperi kaldır; 24°'yi geçince toprak arka kapaktan akar. Kamyonu yavaşça ileri sürersen toprak serilir.
- Kodu: `src/game/sim/truck.ts` (fizik, testi `truck.test.ts`), `src/game/scene/Truck.tsx` (model), `src/game/scene/Site.tsx` (şantiye), `src/game/scene/signs.ts` (yazı levhaları).
