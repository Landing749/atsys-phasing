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
  row: number; // 1-based row in the sheet, matches the PC's convention
  alreadyPresent: boolean;
}

export interface ParsedSf2 {
  students: Student[];
  currentColumn: number | null;
  fileName: string;
}
