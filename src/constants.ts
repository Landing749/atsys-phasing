/**
 * constants.ts
 * Exact mirror of MODERN_COLORS and app constants from attendance_system_v4_5_2.py
 */

// ── Exact MODERN_COLORS from PC ───────────────────────────────────────────────
export const C = {
  primary_dark:    '#1a237e',   // Deep Navy Blue
  primary:         '#283593',   // Navy Blue
  primary_light:   '#3949ab',   // Light Navy
  primary_accent:  '#5c6bc0',   // Accent Blue
  accent_green:    '#2e7d32',   // Professional Green
  accent_orange:   '#e65100',   // Deep Orange
  accent_red:      '#c62828',   // Deep Red
  bg_main:         '#0d1b2a',   // Dark Navy Background
  bg_card:         '#1a2332',   // Card Background
  bg_hover:        '#242f3e',   // Hover State
  bg_light:        '#f5f5f5',   // Light backgrounds
  text_primary:    '#ffffff',   // White text
  text_secondary:  '#b0bec5',   // Light Gray text
  text_dark:       '#212121',   // Dark text for light backgrounds
  success:         '#43a047',   // Green
  warning:         '#fb8c00',   // Orange
  error:           '#e53935',   // Red
  info:            '#1e88e5',   // Blue
  border:          '#37474f',   // Dark gray border
  divider:         '#263238',   // Divider color
} as const;

// ── School info (from PC) ─────────────────────────────────────────────────────
export const SCHOOL_NAME         = 'Dr. Alfredo Pio De Roda ES';
export const SCHOOL_ABBREVIATION = 'DAPR';
export const APP_TITLE           = 'ATSYS';
export const APP_SUBTITLE        = 'ATSYS  •  Attendance Tracking System';
export const APP_VERSION         = '4.5.2-mobile';

// ── Firebase (same project as PC — /licenses node only) ───────────────────────
export const FIREBASE_CONFIG = {
  databaseURL: 'https://licenses-5c397-default-rtdb.firebaseio.com',
};

// ── Timing mirrors from PC ────────────────────────────────────────────────────
export const LICENSE_CHECK_INTERVAL_MS = 10_000;   // 10 s — same as PC
export const SCAN_DEBOUNCE_MS          = 2_000;    // 2 s — same as PC
export const WORKING_FILE_NAME         = 'sf2_working.xlsx';

// ── Layout defaults — mirrors _LAYOUT_DEFAULTS from PC ───────────────────────
export const LAYOUT_DEFAULTS = {
  date_row:          11,
  day_letter_row:    12,
  student_start_row: 13,
  student_name_col:   2,   // Column B
  student_num_col:    1,   // Column A
} as const;

// ── Attendance threshold (DepEd standard) ─────────────────────────────────────
export const ATTENDANCE_THRESHOLD = 80.0;

// ── PC tab labels (mirrored in mobile) ───────────────────────────────────────
export const TABS = [
  { key: 'dashboard', icon: '📊', label: 'DASHBOARD' },
  { key: 'scan',      icon: '📷', label: 'SCAN'      },
  { key: 'manual',    icon: '✍️',  label: 'MANUAL'    },
  { key: 'qr',        icon: '🔲', label: 'QR'        },
  { key: 'stats',     icon: '📈', label: 'STATS'      },
  { key: 'settings',  icon: '⚙️', label: 'SETTINGS'  },
] as const;

export type TabKey = typeof TABS[number]['key'];
