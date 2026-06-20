// Same Firebase project the PC desktop app (ATSYS) already uses for licensing.
// Only the /licenses node is ever touched from mobile — attendance data never
// goes near a server; the SF2 .xlsx file is the only database.
export const FIREBASE_CONFIG = {
  databaseURL: 'https://licenses-5c397-default-rtdb.firebaseio.com',
};

// Mirrors LICENSE_CHECK_INTERVAL on the PC (10 seconds, in ms).
export const LICENSE_CHECK_INTERVAL_MS = 10000;

// Mirrors _LAYOUT_DEFAULTS on the PC.
export const LAYOUT_DEFAULTS = {
  dateRow: 11,
  studentStartRow: 13,
  studentNameCol: 2, // column B
};

// Mirrors the 2-second scan cooldown on the PC.
export const SCAN_DEBOUNCE_MS = 2000;

export const WORKING_FILE_NAME = 'sf2_working.xlsx';
