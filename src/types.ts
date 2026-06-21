export interface LicenseInfo {
  active: boolean;
  org?: string;
  user?: string;
  issuedAt?: string;
  [key: string]: unknown;
}
export interface SavedLicense {
  key: string;
  data: LicenseInfo;
  savedAt: string;
}
export interface Student {
  name: string;
  row: number;
  number: string;
  alreadyPresent: boolean;
}
export interface ParsedSf2 {
  students: Student[];
  currentColumn: number | null;
  fileName: string;
  dateFound: string | null;
}
export interface LayoutSettings {
  date_row: number;
  day_letter_row: number;
  student_start_row: number;
  student_name_col: number;
  student_num_col: number;
}
export type ToastKind = 'ok' | 'warn' | 'error';
export interface ScanEntry {
  name: string;
  timestamp: string;
  source: 'qr' | 'manual';
  action: 'mark' | 'unmark';
}
