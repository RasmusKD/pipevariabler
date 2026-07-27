# Pipe Variabler

En Minecraft storage planlægnings-app til at organisere kister og generere `/signedit` kommandoer.

**Lavet af WhoToldYou** • [Live Demo](https://rasmuskd.github.io/pipevariabler)

## Om appen

Pipe Variabler hjælper dig med at planlægge dit Minecraft storage room ved at lade dig:
- Organisere items i virtuelle kister
- Generere `/signedit` kommandoer automatisk (max 256 tegn)
- Gemme og dele profiler via URL eller kode
- Holde styr på hvilke items der er i hvilke kister

## Features

### Drag & Drop
- **Multi-select** - Vælg flere items med Ctrl+klik og træk dem alle på én gang
- **Drag til tabs** - Træk items eller hele kister direkte til andre tabs
- **Omarrangér kister** - Træk kister for at ændre rækkefølgen
- **Auto-skift tab** - Hold over et tab mens du dragger for automatisk at skifte til det
- **Opret kiste ved drop** - Træk items til "Tilføj kiste" zone eller et tab for at oprette ny kiste

### Organisation
- **Tabs** - Organiser kister i kategorier (fx Wood, Blocks, Plants)
- **Søgning** - Find items hurtigt i 1400+ Minecraft items
- **Visninger** - Skift mellem grid og liste for både sidebar og kister
- **Chest icons** - Tilpas kiste-ikoner med alle Minecraft billeder
- **Klik til kiste** - Klik på chest-ID i sidebar for at navigere til kisten

### Profiler & Deling
- **Import/Export** - Gem profiler som JSON filer
- **URL Deling** - Del profiler via link (Base64 + gzip kompression)
- **Kopier Kode** - Del profiler som komprimeret kode-streng
- **Templates** - Brug færdige templates (fx "Ivers Kisterum" med 142 kister)
- **Undo/Redo** - Fortryd handlinger med Ctrl+Z / Ctrl+Y

### Chest Features
- **Auto-navngivning** - Kister navngives automatisk efter første item
- **Kommando kopiering** - Et-klik kopiering af signedit kommando
- **Tegn-tæller** - Se antal tegn (max 256 for Minecraft signs)
- **Mark som færdig** - Marker kister som færdige med checkbox

## Tech Stack

| Pakke | Version | Beskrivelse |
|-------|---------|-------------|
| React | 19.2.3 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.1.18 | Utility-first styling |
| @dnd-kit | 6.3+ | Drag-and-drop |
| react-window | 2.2.3 | Virtualiseret liste |
| pako | 2.1.0 | Kompression |

## Projektstruktur

```
src/
├── components/      # UI komponenter (Sidebar, TabBar, ChestGrid...)
├── context/         # React Context for global state
├── hooks/           # Custom hooks (useDragController, useChests...)
├── dnd/             # Drag-and-drop komponenter
├── scss/            # Stylesheets
├── data.json        # Minecraft items database (1400+ items)
└── spriteMap.json   # Sprite positions for icons
```

## Udvikling

```bash
npm install    # Installer dependencies
npm start      # Start dev server
npm run build  # Byg til produktion
npm run deploy # Deploy til GitHub Pages
```

## Ikoner

Alle item-ikoner kommer fra [mc.nerothe.com](https://mc.nerothe.com/) (64x64, pr. Minecraft-version).

**Sådan opdateres ikonerne** (fx til en ny Minecraft-version):
1. Hent ikon-pakken (zip) fra [mc.nerothe.com](https://mc.nerothe.com/)
2. Filerne hedder `minecraft_<item>.png` - fjern `minecraft_`-prefixet og kopiér dem til `solid-version/public/assets/images/icons/`
3. Tilføj de nye items i `solid-version/src/data.json` ved siden af relaterede items (listen er kurateret: kun survival-items, creative-menu rækkefølge)
4. Kør `node scripts/generate-sprites.cjs` fra `solid-version/`
5. Kør `ffmpeg -y -i public/assets/images/spritesheet.png -lossless 1 -compression_level 6 public/assets/images/spritesheet.webp`

Se også kommentaren i `solid-version/scripts/generate-sprites.cjs`.
