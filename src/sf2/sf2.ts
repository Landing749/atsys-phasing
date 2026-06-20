import { Directory, File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { LAYOUT_DEFAULTS, WORKING_FILE_NAME } from '../constants';
import { ParsedSf2, Student } from '../types';

let workbook: XLSX.WorkBook | null = null;
let workingFile: File | null = null;

export function isLoaded(): boolean {
  return workbook !== null;
}

export function getWorkingFile(): File | null {
  return workingFile;
}

function atomicWriteBytes(target: File, bytes: Uint8Array): void {
  const tmp = new File(target.parentDirectory, `${target.name}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.write(bytes);

  try {
    tmp.moveSync(target, { overwrite: true });
  } catch {
    // Fall back to delete-then-move if overwrite isn't honoured on this platform.
    if (target.exists) target.delete();
    tmp.moveSync(target);
  }
}

/**
 * Mirrors _load_file_impl on the PC: copy the picked file into app storage so we
 * own a writable copy, parse it with SheetJS, find today's date column, and build
 * the student list from student_name_col.
 */
export async function loadSf2(pickedUri: string, displayName: string): Promise<ParsedSf2> {
  const source = new File(pickedUri);
  const docsDir = new Directory(Paths.document);
  if (!docsDir.exists) docsDir.create();

  const working = new File(Paths.document, WORKING_FILE_NAME);
  if (working.exists) working.delete();
  source.copySync(working);
  workingFile = working;

  const bytes = working.bytesSync();
  workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const { dateRow, studentStartRow, studentNameCol } = LAYOUT_DEFAULTS;
  const today = new Date().getDate();
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');

  // Step 1 — find current_column by scanning date_row for today's day-of-month.
  let currentColumn: number | null = null;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: dateRow - 1, c });
    const cell = sheet[addr];
    if (cell && parseInt(String(cell.v), 10) === today) {
      currentColumn = c + 1; // 1-based, matches the PC's convention
      break;
    }
  }

  // Step 2 — build the student list from student_name_col, and
  // Step 3 — read existing ✓ marks for today's column, in the same pass.
  const students: Student[] = [];
  for (let r = studentStartRow; r <= range.e.r + 1; r++) {
    const nameAddr = XLSX.utils.encode_cell({ r: r - 1, c: studentNameCol - 1 });
    const nameCell = sheet[nameAddr];
    const name = nameCell?.v ? String(nameCell.v).trim() : '';
    if (!name) continue;

    let alreadyPresent = false;
    if (currentColumn) {
      const markAddr = XLSX.utils.encode_cell({ r: r - 1, c: currentColumn - 1 });
      alreadyPresent = sheet[markAddr]?.v === '✓';
    }
    students.push({ name, row: r, alreadyPresent });
  }

  return { students, currentColumn, fileName: displayName };
}

/**
 * Mirrors auto_save_attendance on the PC: write ✓ into the cell in memory, then
 * save atomically (write to a temp file, then rename over the working copy), then
 * reload the workbook from disk — SheetJS can lose internal state after a write,
 * same reason the PC reloads with load_workbook() after every save.
 */
export function markPresentAndSave(row: number, currentColumn: number): void {
  if (!workbook || !workingFile) throw new Error('No SF2 file loaded');

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: currentColumn - 1 });
  sheet[addr] = { v: '✓', t: 's' };

  const out = new Uint8Array(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  );
  atomicWriteBytes(workingFile, out);

  const bytes = workingFile.bytesSync();
  workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
}

/** Mirrors the undo path on the PC's Manual tab — clears a mark and saves. */
export function unmarkAndSave(row: number, currentColumn: number): void {
  if (!workbook || !workingFile) throw new Error('No SF2 file loaded');

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: currentColumn - 1 });
  delete sheet[addr];

  const out = new Uint8Array(
    XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  );
  atomicWriteBytes(workingFile, out);

  const bytes = workingFile.bytesSync();
  workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
}