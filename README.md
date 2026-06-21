# ATSYS Mobile — v4.5.2

**Companion to ATSYS PC v4.5.2** · React Native / Expo · Android & iOS

Mobile attendance scanner for **Dr. Alfredo Pio De Roda Elementary School**.

---

## Tabs — exact mirror of PC app notebook

| Tab | Icon | Matches PC tab |
|-----|------|----------------|
| **Dashboard** | 📊 | `DASHBOARD` — 4 KPI cards, analytics bar, quick actions |
| **Scan**      | 📷 | `SCAN` — camera feed, DO-NOT-OPEN ticker, system status, counters, controls |
| **Manual**    | ✍️  | `MANUAL ATTENDANCE` — searchable roster, mark/unmark, counters |
| **QR Codes**  | 🔲 | `QR CODE GENERATOR` — full student grid, full-screen QR modal |
| **Stats**     | 📈 | `STUDENT STATISTICS` — fuzzy search, KPI pills, risk calculator, day-of-week breakdown |
| **Settings**  | ⚙️  | `SETTINGS` — Layout Wizard, scan debounce, session journal, license, share file |

---

## Exact color match

All colors are taken directly from `MODERN_COLORS` in `attendance_system_v4_5_2.py`:

```
primary_dark  #1a237e   bg_main      #0d1b2a
primary       #283593   bg_card      #1a2332
primary_light #3949ab   bg_hover     #242f3e
primary_accent#5c6bc0   text_primary #ffffff
success       #43a047   text_secondary#b0bec5
warning       #fb8c00   border       #37474f
error         #e53935   divider      #263238
info          #1e88e5
```

Splash background = `#1a237e` (primary_dark), matching PC splash.  
App header = `primary_dark`. 3px divider below header = `primary`. Tab bar = `bg_card`.

---

## File move semantics

The app **moves** (not copies) the picked SF2 file into app storage.  
This preserves all Excel formatting, images, and embedded objects — exactly what the PC does when it opens the file in place.

```
Admin PC → transfer SF2.xlsx → Teacher phone
Teacher phone → ATSYS Mobile → moves file → marks ✓ → atomic save
Teacher phone → Settings → Share Updated SF2 → Admin PC → opens in Excel ✓
```

---

## Stats tab — full parity with PC

- Fuzzy name search: exact substring → token match → SequenceMatcher ratio ≥ 0.55 (up to 8 results)
- KPI pills: Days Tracked · Present% · Absent% · Most Absent Day
- Attendance rate progress bar (green/red)
- Day-of-week breakdown pills
- Absent dates list
- **Risk Calculator**: CRITICAL (<70%) / HIGH (<80%) / MEDIUM (<90%) / LOW (≥90%)
- Consecutive absence detection (3+ bumps to at least HIGH)
- Best-case / worst-case monthly projections
- Recommendation: days needed to reach 80% DepEd threshold

---

## Setup

```bash
# Install dependencies
npm install

# Dev (Expo Go)
npx expo start

# Build APK (sideload)
eas build --platform android --profile preview
```

### Enable QR code display
```bash
# Already in package.json — just run:
npm install
# Then rebuild (required for native module):
npx expo prebuild --clean
eas build --platform android --profile preview
```

---

## Project structure

```
atsys-mobile/
├── App.tsx                        # Root: bootstrap → EULA → license → tabs
├── src/
│   ├── constants.ts               # MODERN_COLORS (exact PC copy), app meta
│   ├── types.ts                   # Shared interfaces
│   ├── storage.ts                 # AsyncStorage helpers
│   ├── ui.tsx                     # Shared components: Card, CounterCard, TabBar, AppHeader…
│   ├── license/
│   │   ├── LicenseManager.ts      # Validate / verify (same Firebase project as PC)
│   │   ├── EulaScreen.tsx
│   │   └── LicenseEntryScreen.tsx
│   ├── sf2/
│   │   ├── sf2.ts                 # loadSf2 (MOVE), mark, unmark, autoDetect, getSheet
│   │   └── LoadScreen.tsx
│   ├── dashboard/DashboardTab.tsx  # 4 KPI cards + analytics + quick actions
│   ├── scan/ScanTab.tsx           # Camera + DO-NOT-OPEN ticker + counters + controls
│   ├── manual/ManualTab.tsx       # Searchable roster + mark/unmark
│   ├── qr/QrTab.tsx               # QR grid + full-screen modal
│   ├── stats/StatsTab.tsx         # Fuzzy search + full risk calculator
│   ├── settings/SettingsTab.tsx   # Layout, debounce, journal, license, share
│   └── wizard/LayoutWizard.tsx    # Step-by-step layout config modal
└── assets/                        # Icon, splash (same assets as PC)
```
