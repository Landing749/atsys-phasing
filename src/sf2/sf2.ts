import { Directory, File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { WORKING_FILE_NAME } from '../constants';
import { LayoutSettings, ParsedSf2, Student } from '../types';

let workbook: XLSX.WorkBook | null = null;
let workingFile: File | null = null;

export function isLoaded()         { return workbook !== null; }
export function getWorkingFile()   { return workingFile; }
export function getWorkbook()      { return workbook; }
export function getSheet()         { return workbook?.Sheets[workbook.SheetNames[0]] ?? null; }

function atomicWrite(target: File, bytes: Uint8Array) {
  const tmp = new File(target.parentDirectory, `${target.name}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.write(bytes);
  try { tmp.moveSync(target, { overwrite: true }); }
  catch { if (target.exists) target.delete(); tmp.moveSync(target); }
}

/** Moves (not copies) the picked file into app storage to preserve styling/images. */
export async function loadSf2(pickedUri: string, displayName: string, layout: LayoutSettings): Promise<ParsedSf2> {
  const docsDir = new Directory(Paths.document);
  if (!docsDir.exists) docsDir.create();

  const working = new File(Paths.document, WORKING_FILE_NAME);
  if (working.exists) working.delete();

  const source = new File(pickedUri);
  try { source.moveSync(working, { overwrite: true }); }
  catch { source.copySync(working); }

  workingFile = working;
  const bytes = working.bytesSync();
  workbook = XLSX.read(bytes, { type: 'array', cellDates: true });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const { date_row, student_start_row, student_name_col, student_num_col } = layout;
  const today = new Date().getDate();
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');

  let currentColumn: number | null = null;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: date_row - 1, c })];
    if (cell && parseInt(String(cell.v), 10) === today) { currentColumn = c + 1; break; }
  }

  const students: Student[] = [];
  for (let r = student_start_row; r <= range.e.r + 1; r++) {
    const nameCell = sheet[XLSX.utils.encode_cell({ r: r - 1, c: student_name_col - 1 })];
    const name = nameCell?.v ? String(nameCell.v).trim() : '';
    if (!name) continue;
    const numCell = sheet[XLSX.utils.encode_cell({ r: r - 1, c: student_num_col - 1 })];
    const number = numCell?.v ? String(numCell.v).trim() : '';
    let alreadyPresent = false;
    if (currentColumn) {
      const markCell = sheet[XLSX.utils.encode_cell({ r: r - 1, c: currentColumn - 1 })];
      alreadyPresent = markCell?.v === '✓';
    }
    students.push({ name, row: r, number, alreadyPresent });
  }

  const month = new Date().toLocaleString('default', { month: 'long' });
  return { students, currentColumn, fileName: displayName, dateFound: currentColumn ? `${month} ${today}` : null };
}

export function markPresentAndSave(row: number, col: number) {
  if (!workbook || !workingFile) throw new Error('No SF2 loaded');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  sheet[XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })] = { v: '✓', t: 's' };
  const out = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
  atomicWrite(workingFile, out);
  const bytes = workingFile.bytesSync();
  workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
}

export function unmarkAndSave(row: number, col: number) {
  if (!workbook || !workingFile) throw new Error('No SF2 loaded');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  delete sheet[XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })];
  const out = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
  atomicWrite(workingFile, out);
  const bytes = workingFile.bytesSync();
  workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
}

export function unloadSf2() { workbook = null; workingFile = null; }

/** Auto-detect layout heuristics — mirrors PC's open_layout_wizard() */
export function autoDetectLayout(defaults: LayoutSettings): Partial<LayoutSettings> & { detectedNames: string[] } {
  if (!workbook) return { ...defaults, detectedNames: [] };
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const detected: Partial<LayoutSettings> = { ...defaults };

  for (let r = range.s.r; r <= Math.min(range.e.r, 25); r++) {
    let count = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = sheet[XLSX.utils.encode_cell({ r, c })]?.v;
      const n = parseInt(String(v ?? ''), 10);
      if (!isNaN(n) && n >= 1 && n <= 31) count++;
    }
    if (count >= 5) { detected.date_row = r + 1; detected.day_letter_row = r + 2; detected.student_start_row = r + 3; break; }
  }

  const startRow = (detected.student_start_row ?? defaults.student_start_row) - 1;
  const scores: Record<number, number> = {};
  for (let c = range.s.c; c <= Math.min(range.e.c, 10); c++) {
    let score = 0;
    for (let r = startRow; r <= Math.min(startRow + 50, range.e.r); r++) {
      const v = String(sheet[XLSX.utils.encode_cell({ r, c })]?.v ?? '').trim();
      if (v.length > 3 && /[A-Za-z]/.test(v) && !/^\d+$/.test(v)) score++;
    }
    scores[c] = score;
  }
  const best = Object.entries(scores).sort((a, b) => +b[1] - +a[1])[0];
  if (best && +best[1] > 0) detected.student_name_col = +best[0] + 1;

  const nc = (detected.student_name_col ?? defaults.student_name_col) - 1;
  const detectedNames: string[] = [];
  for (let r = startRow; r <= range.e.r && detectedNames.length < 5; r++) {
    const v = String(sheet[XLSX.utils.encode_cell({ r, c: nc })]?.v ?? '').trim();
    if (v.length > 1) detectedNames.push(v);
  }
  return { ...detected, detectedNames };
}
