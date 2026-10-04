// Formeln der Tabellen in der Ablage: Rechnen wie in Excel (deutsche und englische Funktionsnamen, „;“ oder „,“
// als Trennzeichen), Zellbezüge (auch auf andere Blätter), Bereiche, Fehlerwerte und Zirkelbezüge.
// Läuft im Browser (Anzeige) und auf dem Server (berechnete Werte in der .xlsx-Datei).

export type ErrorCode = "#DIV/0!" | "#NAME?" | "#REF!" | "#VALUE!" | "#N/A" | "#NUM!" | "#CYCLE!";
export type CellError = { error: ErrorCode };
export type Value = number | string | boolean | null | CellError;

export const isError = (value: unknown): value is CellError =>
  typeof value === "object" && value !== null && "error" in value;
const fail = (error: ErrorCode): CellError => ({ error });

// Fehler in der Oberfläche wie im deutschen Excel.
export const ERROR_LABELS: Record<ErrorCode, string> = {
  "#DIV/0!": "#DIV/0!",
  "#NAME?": "#NAME?",
  "#REF!": "#BEZUG!",
  "#VALUE!": "#WERT!",
  "#N/A": "#NV",
  "#NUM!": "#ZAHL!",
  "#CYCLE!": "#ZIRKELBEZUG!",
};
export const ERROR_HINTS: Record<ErrorCode, string> = {
  "#DIV/0!": "Division durch null",
  "#NAME?": "Unbekannte Funktion oder unbekannter Name",
  "#REF!": "Ungültiger Zellbezug oder unbekanntes Blatt",
  "#VALUE!": "Falscher Werttyp, z. B. Text statt Zahl",
  "#N/A": "Wert nicht gefunden",
  "#NUM!": "Ungültige Zahl",
  "#CYCLE!": "Die Formel bezieht sich (über Umwege) auf ihre eigene Zelle",
};

// ---------- Zellbezüge ----------

export const MAX_COLS = 702; // A … ZZ
export const MAX_ROWS = 100_000;

export function columnName(index: number) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26))
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  return name;
}

export function columnIndex(name: string) {
  let value = 0;
  for (const char of name.toUpperCase()) value = value * 26 + (char.charCodeAt(0) - 64);
  return value - 1;
}

export const cellKey = (col: number, row: number) => `${columnName(col)}${row + 1}`;

export function parseCellKey(key: string) {
  const match = /^\$?([A-Za-z]{1,3})\$?(\d{1,6})$/.exec(key.trim());
  if (!match) return null;
  const col = columnIndex(match[1]);
  const row = Number(match[2]) - 1;
  if (col < 0 || col >= MAX_COLS || row < 0 || row >= MAX_ROWS) return null;
  return { col, row };
}

export type Area = { c1: number; r1: number; c2: number; r2: number };
export function parseArea(text: string): Area | null {
  const [from, to = from] = text.split(":");
  const a = parseCellKey(from);
  const b = parseCellKey(to);
  if (!a || !b) return null;
  return {
    c1: Math.min(a.col, b.col),
    r1: Math.min(a.row, b.row),
    c2: Math.max(a.col, b.col),
    r2: Math.max(a.row, b.row),
  };
}
export const areaName = (area: Area) =>
  area.c1 === area.c2 && area.r1 === area.r2
    ? cellKey(area.c1, area.r1)
    : `${cellKey(area.c1, area.r1)}:${cellKey(area.c2, area.r2)}`;

// ---------- Datum ----------

const DAY = 86_400_000;
const EPOCH = Date.UTC(1899, 11, 30);
export const dateSerial = (year: number, month: number, day: number) => (Date.UTC(year, month - 1, day) - EPOCH) / DAY;
export function serialDate(serial: number) {
  const date = new Date(EPOCH + Math.floor(serial) * DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
export function todaySerial(now = new Date()) {
  return dateSerial(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// ---------- Eingaben ----------

export type ParsedInput =
  | { type: "empty" }
  | { type: "formula"; formula: string }
  | { type: "number"; value: number; format?: "percent" | "date" | "time" | "datetime" }
  | { type: "boolean"; value: boolean }
  | { type: "text"; value: string };

// Eingabe in eine Zelle: Formel, Zahl („1'250.50“, „12,5“, „15%“), Datum („4.10.2026“), Uhrzeit („07:30“),
// Wahrheitswert oder Text (mit führendem Apostroph immer Text).
export function parseInput(raw: string): ParsedInput {
  if (raw === "") return { type: "empty" };
  if (raw.startsWith("=") && raw.length > 1) return { type: "formula", formula: raw.slice(1) };
  if (raw.startsWith("'")) return { type: "text", value: raw.slice(1) };
  const text = raw.trim();
  const upper = text.toUpperCase();
  if (upper === "WAHR" || upper === "TRUE") return { type: "boolean", value: true };
  if (upper === "FALSCH" || upper === "FALSE") return { type: "boolean", value: false };
  const percent = /^([-+]?\d+(?:[.,]\d+)?)\s*%$/.exec(text);
  if (percent) return { type: "number", value: Number(percent[1].replace(",", ".")) / 100, format: "percent" };
  const date = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(text);
  if (date) {
    const day = Number(date[1]);
    const month = Number(date[2]);
    const year = date[3].length === 2 ? 2000 + Number(date[3]) : Number(date[3]);
    const serial = dateSerial(year, month, day);
    const check = serialDate(serial);
    if (check.day === day && check.month === month) {
      if (date[4] === undefined) return { type: "number", value: serial, format: "date" };
      const minutes = Number(date[4]) * 60 + Number(date[5]);
      if (minutes < 24 * 60) return { type: "number", value: serial + minutes / 1440, format: "datetime" };
    }
  }
  const time = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (time && Number(time[1]) < 24 && Number(time[2]) < 60)
    return { type: "number", value: (Number(time[1]) * 60 + Number(time[2])) / 1440, format: "time" };
  const number = /^[-+]?(?:\d{1,3}(?:['’]\d{3})+|\d+)(?:[.,]\d+)?(?:[eE][-+]?\d+)?$/.exec(text);
  if (number) return { type: "number", value: Number(text.replace(/['’]/g, "").replace(",", ".")) };
  return { type: "text", value: raw };
}

// ---------- Zerlegen ----------

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; v: string; sheet?: string }
  | { t: "name"; v: string }
  | { t: "op"; v: string }
  | { t: "err"; v: ErrorCode }
  | { t: "cols"; v: string; sheet?: string }
  | { t: "sep" }
  | { t: "(" }
  | { t: ")" };

class SyntaxProblem extends Error {}

const NAME_CHAR = /[A-Za-zÄÖÜäöüß0-9_.]/;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === '"') {
      let value = "";
      i += 1;
      for (;;) {
        if (i >= source.length) throw new SyntaxProblem("Anführungszeichen nicht geschlossen");
        if (source[i] === '"') {
          if (source[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        value += source[i];
        i += 1;
      }
      tokens.push({ t: "str", v: value });
      continue;
    }
    if (char === "'") {
      // 'Blatt mit Leerzeichen'!A1
      const close = source.indexOf("'!", i + 1);
      if (close < 0) throw new SyntaxProblem("Blattname nicht geschlossen");
      const sheet = source.slice(i + 1, close).replace(/''/g, "'");
      i = close + 2;
      const ref = /^\$?[A-Za-z]{1,3}\$?\d+/.exec(source.slice(i));
      if (!ref) throw new SyntaxProblem("Zellbezug erwartet");
      tokens.push({ t: "ref", v: ref[0], sheet });
      i += ref[0].length;
      continue;
    }
    if (/\d/.test(char) || (char === "." && /\d/.test(source[i + 1] ?? ""))) {
      const match = /^\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(source.slice(i))!;
      tokens.push({ t: "num", v: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (char === "$" || NAME_CHAR.test(char)) {
      let word = "";
      while (i < source.length && (NAME_CHAR.test(source[i]) || source[i] === "$")) word += source[i++];
      if (source[i] === "!") {
        i += 1;
        const ref = /^\$?[A-Za-z]{1,3}\$?\d+/.exec(source.slice(i));
        if (!ref) throw new SyntaxProblem("Zellbezug erwartet");
        tokens.push({ t: "ref", v: ref[0], sheet: word });
        i += ref[0].length;
        continue;
      }
      if (/^\$?[A-Za-z]{1,3}\$?\d+$/.test(word) && parseCellKey(word)) tokens.push({ t: "ref", v: word });
      else {
        // Ganze Spalten („A:A“, „B:D“).
        const columns =
          /^\$?[A-Za-z]{1,3}$/.test(word) && source[i] === ":"
            ? /^:(\$?[A-Za-z]{1,3})(?![\w(!])/.exec(source.slice(i))
            : null;
        if (columns) {
          tokens.push({ t: "cols", v: `${word}:${columns[1]}` });
          i += columns[0].length;
        } else tokens.push({ t: "name", v: word });
      }
      continue;
    }
    if (char === "#") {
      const match = /^#(?:BEZUG|REF)!/i.exec(source.slice(i));
      if (!match) throw new SyntaxProblem("Unerwartetes Zeichen „#“");
      tokens.push({ t: "err", v: "#REF!" });
      i += match[0].length;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (two === "<>" || two === "<=" || two === ">=") {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>%:".includes(char)) tokens.push({ t: "op", v: char });
    else if (char === ";" || char === ",") tokens.push({ t: "sep" });
    else if (char === "(") tokens.push({ t: "(" });
    else if (char === ")") tokens.push({ t: ")" });
    else throw new SyntaxProblem(`Unerwartetes Zeichen „${char}“`);
    i += 1;
  }
  return tokens;
}

// ---------- Baum ----------

export type Expr =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "ref"; sheet?: string; col: number; row: number }
  | { k: "range"; sheet?: string; area: Area }
  | { k: "unary"; op: string; arg: Expr }
  | { k: "percent"; arg: Expr }
  | { k: "binary"; op: string; left: Expr; right: Expr }
  | { k: "call"; name: string; args: Expr[] }
  | { k: "error"; code: ErrorCode };

const PRECEDENCE: Record<string, number> = {
  "=": 1,
  "<>": 1,
  "<": 1,
  ">": 1,
  "<=": 1,
  ">=": 1,
  "&": 2,
  "+": 3,
  "-": 3,
  "*": 4,
  "/": 4,
  "^": 5,
};

export function parseFormula(source: string): Expr {
  const tokens = tokenize(source);
  let pos = 0;
  const peek = () => tokens[pos];
  function primary(): Expr {
    const token = tokens[pos++];
    if (!token) throw new SyntaxProblem("Formel unvollständig");
    if (token.t === "num") return { k: "num", v: token.v };
    if (token.t === "str") return { k: "str", v: token.v };
    if (token.t === "err") return { k: "error", code: token.v };
    if (token.t === "cols") {
      const [from, to] = token.v.replace(/\$/g, "").split(":").map(columnIndex);
      return {
        k: "range",
        sheet: token.sheet,
        area: { c1: Math.min(from, to), r1: 0, c2: Math.max(from, to), r2: MAX_ROWS - 1 },
      };
    }
    if (token.t === "op" && (token.v === "-" || token.v === "+")) return { k: "unary", op: token.v, arg: postfix() };
    if (token.t === "(") {
      const inner = expression(0);
      if (peek()?.t !== ")") throw new SyntaxProblem("Klammer nicht geschlossen");
      pos += 1;
      return inner;
    }
    if (token.t === "ref") {
      const start = parseCellKey(token.v);
      if (!start) return { k: "error", code: "#REF!" };
      const next = peek();
      if (next?.t === "op" && next.v === ":") {
        pos += 1;
        const end = tokens[pos++];
        if (end?.t !== "ref") throw new SyntaxProblem("Bereich unvollständig");
        const area = parseArea(`${token.v}:${end.v}`);
        if (!area) return { k: "error", code: "#REF!" };
        return { k: "range", sheet: token.sheet, area };
      }
      return { k: "ref", sheet: token.sheet, col: start.col, row: start.row };
    }
    if (token.t === "name") {
      const upper = token.v.toUpperCase();
      if (peek()?.t === "(") {
        pos += 1;
        const args: Expr[] = [];
        if (peek()?.t === ")") pos += 1;
        else
          for (;;) {
            // Leeres Argument („WENN(A1;;1)“) zählt als leer.
            if (peek()?.t === "sep" || peek()?.t === ")") args.push({ k: "str", v: "" });
            else args.push(expression(0));
            const after = tokens[pos++];
            if (after?.t === ")") break;
            if (after?.t !== "sep") throw new SyntaxProblem("Trennzeichen „;“ oder „)“ erwartet");
          }
        return { k: "call", name: upper, args };
      }
      if (upper === "WAHR" || upper === "TRUE") return { k: "bool", v: true };
      if (upper === "FALSCH" || upper === "FALSE") return { k: "bool", v: false };
      return { k: "error", code: "#NAME?" };
    }
    throw new SyntaxProblem("Unerwartetes Zeichen in der Formel");
  }
  function postfix(): Expr {
    let node = primary();
    while (peek()?.t === "op" && (peek() as { v: string }).v === "%") {
      pos += 1;
      node = { k: "percent", arg: node };
    }
    return node;
  }
  function expression(min: number): Expr {
    let left = postfix();
    for (;;) {
      const token = peek();
      if (token?.t !== "op" || !(token.v in PRECEDENCE)) break;
      const precedence = PRECEDENCE[token.v];
      if (precedence < min) break;
      pos += 1;
      const right = expression(token.v === "^" ? precedence : precedence + 1);
      left = { k: "binary", op: token.v, left, right };
    }
    return left;
  }
  const result = expression(0);
  if (pos < tokens.length) throw new SyntaxProblem("Unerwarteter Rest in der Formel");
  return result;
}

// Prüft eine Formel beim Eingeben; null = in Ordnung, sonst ein verständlicher Hinweis.
export function formulaProblem(source: string) {
  try {
    parseFormula(source);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Formel ungültig";
  }
}

// ---------- Rechnen ----------

type Grid = Value[][];
type Arg = Value | Grid;
export type Resolver = {
  cell: (sheet: string | undefined, col: number, row: number) => Value;
  hasSheet: (sheet: string) => boolean;
  // Benutzte Zeilen eines Blatts: ganze Spalten („A:A“) werden darauf begrenzt.
  rows?: (sheet: string | undefined) => number;
  today?: () => number;
  now?: () => number;
  // Die Zelle, deren Formel gerade berechnet wird (für ZEILE() und SPALTE() ohne Bezug).
  self?: { col: number; row: number };
};

const isGrid = (value: Arg): value is Grid => Array.isArray(value);

function toNumber(value: Value): number | CellError {
  if (isError(value)) return value;
  if (value === null || value === "") return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value;
  const parsed = parseInput(value);
  return parsed.type === "number" ? parsed.value : fail("#VALUE!");
}

export function toText(value: Value): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "WAHR" : "FALSCH";
  if (typeof value === "number") return String(Number(value.toPrecision(15)));
  if (isError(value)) return ERROR_LABELS[value.error];
  return value;
}

const truthy = (value: Value): boolean | CellError => {
  if (isError(value)) return value;
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    if (upper === "WAHR" || upper === "TRUE") return true;
    if (upper === "FALSCH" || upper === "FALSE" || upper === "") return false;
    return fail("#VALUE!");
  }
  return Boolean(value);
};

function compare(left: Value, right: Value): number {
  const rank = (value: Value) => (typeof value === "number" || value === null ? 0 : typeof value === "string" ? 1 : 2);
  let a = left;
  let b = right;
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === "string" && typeof b === "string")
    return a.localeCompare(b, "de-CH", { sensitivity: "base", numeric: false });
  return Number(a) - Number(b);
}

const scalar = (arg: Arg): Value => {
  if (!isGrid(arg)) return arg;
  if (arg.length === 1 && arg[0].length === 1) return arg[0][0];
  return fail("#VALUE!");
};
const flat = (args: Arg[]) => args.flatMap((arg) => (isGrid(arg) ? arg.flat() : [arg]));

// Zahlen für SUMME & Co.: in Bereichen zählen nur Zahlen, direkt angegebene Werte werden umgewandelt.
function numbers(args: Arg[]): number[] | CellError {
  const out: number[] = [];
  for (const arg of args) {
    if (isGrid(arg)) {
      for (const value of arg.flat()) {
        if (isError(value)) return value;
        if (typeof value === "number") out.push(value);
      }
    } else {
      if (arg === null) continue;
      const number = toNumber(arg);
      if (isError(number)) return number;
      out.push(number);
    }
  }
  return out;
}

// Kriterium für ZÄHLENWENN/SUMMEWENN: „>5“, „<>erledigt“, „=Ja“, „Mo*“ oder ein Wert.
function criterion(raw: Value): (value: Value) => boolean {
  if (typeof raw !== "string") return (value) => !isError(value) && value !== null && compare(value, raw) === 0;
  const match = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(raw)!;
  const op = match[1] ?? "=";
  const operand = parseInput(match[2]);
  const target: Value =
    operand.type === "number" || operand.type === "boolean" ? operand.value : match[2] === "" ? null : match[2];
  if (typeof target === "string" && (op === "=" || op === "<>") && /[*?]/.test(target)) {
    const pattern = new RegExp(
      `^${target
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".")}$`,
      "i",
    );
    return (value) => {
      const hit = typeof value === "string" && pattern.test(value);
      return op === "=" ? hit : !hit;
    };
  }
  return (value) => {
    if (isError(value)) return false;
    if (target === null) return op === "<>" ? value !== null && value !== "" : value === null || value === "";
    if (value === null) return op === "<>";
    if ((typeof target === "number") !== (typeof value === "number")) return op === "<>";
    const result = compare(value, target);
    if (op === "=") return result === 0;
    if (op === "<>") return result !== 0;
    if (op === "<") return result < 0;
    if (op === ">") return result > 0;
    if (op === "<=") return result <= 0;
    return result >= 0;
  };
}

const round = (value: number, digits: number, mode: "half" | "up" | "down") => {
  const factor = 10 ** digits;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  const rounded = mode === "half" ? Math.round(scaled) : mode === "up" ? Math.ceil(scaled) : Math.floor(scaled);
  return (Math.sign(value) * rounded) / factor;
};

type Impl = (args: Arg[], resolver: Resolver) => Value;

function numeric(fn: (...values: number[]) => Value, arity: [number, number]): Impl {
  return (args) => {
    if (args.length < arity[0] || args.length > arity[1]) return fail("#VALUE!");
    const values: number[] = [];
    for (const arg of args) {
      const number = toNumber(scalar(arg));
      if (isError(number)) return number;
      values.push(number);
    }
    const result = fn(...values);
    if (typeof result === "number" && !Number.isFinite(result)) return fail("#NUM!");
    return result;
  };
}
function textual(fn: (text: string, ...rest: number[]) => Value, arity: [number, number]): Impl {
  return (args) => {
    if (args.length < arity[0] || args.length > arity[1]) return fail("#VALUE!");
    const first = scalar(args[0]);
    if (isError(first)) return first;
    const rest: number[] = [];
    for (const arg of args.slice(1)) {
      const number = toNumber(scalar(arg));
      if (isError(number)) return number;
      rest.push(number);
    }
    return fn(toText(first), ...rest);
  };
}
const aggregate =
  (fn: (values: number[]) => number | CellError): Impl =>
  (args) => {
    const values = numbers(args);
    return isError(values) ? values : fn(values);
  };

function conditional(args: Arg[], mode: "sum" | "count" | "average"): Value {
  if (args.length < 2 || !isGrid(args[0])) return fail("#VALUE!");
  const range = args[0];
  const test = criterion(scalar(args[1]));
  const values = args[2] !== undefined ? args[2] : range;
  if (!isGrid(values)) return fail("#VALUE!");
  let sum = 0;
  let count = 0;
  range.forEach((row, r) =>
    row.forEach((value, c) => {
      if (!test(value)) return;
      if (mode === "count") return void (count += 1);
      const target = values[r]?.[c] ?? null;
      if (typeof target === "number") {
        sum += target;
        count += 1;
      }
    }),
  );
  if (mode === "count") return count;
  if (mode === "sum") return sum;
  return count ? sum / count : fail("#DIV/0!");
}

const FUNCTIONS: Record<string, Impl> = {
  SUM: aggregate((values) => values.reduce((a, b) => a + b, 0)),
  AVERAGE: aggregate((values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : fail("#DIV/0!"))),
  MIN: aggregate((values) => (values.length ? Math.min(...values) : 0)),
  MAX: aggregate((values) => (values.length ? Math.max(...values) : 0)),
  PRODUCT: aggregate((values) => (values.length ? values.reduce((a, b) => a * b, 1) : 0)),
  MEDIAN: aggregate((values) => {
    if (!values.length) return fail("#NUM!");
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }),
  COUNT: (args) => flat(args).filter((value) => typeof value === "number").length,
  COUNTA: (args) => flat(args).filter((value) => value !== null && value !== "").length,
  COUNTBLANK: (args) => flat(args).filter((value) => value === null || value === "").length,
  SUMIF: (args) => conditional(args, "sum"),
  COUNTIF: (args) => conditional(args, "count"),
  AVERAGEIF: (args) => conditional(args, "average"),
  IF: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const test = truthy(scalar(args[0]));
    if (isError(test)) return test;
    return test ? scalar(args[1]) : args.length > 2 ? scalar(args[2]) : false;
  },
  IFERROR: (args) => {
    if (args.length !== 2) return fail("#VALUE!");
    const value = scalar(args[0]);
    return isError(value) ? scalar(args[1]) : value;
  },
  AND: (args) => {
    const values = flat(args).filter((value) => value !== null);
    if (!values.length) return fail("#VALUE!");
    for (const value of values) {
      const test = truthy(value);
      if (isError(test)) return test;
      if (!test) return false;
    }
    return true;
  },
  OR: (args) => {
    const values = flat(args).filter((value) => value !== null);
    if (!values.length) return fail("#VALUE!");
    let any = false;
    for (const value of values) {
      const test = truthy(value);
      if (isError(test)) return test;
      any = any || test;
    }
    return any;
  },
  NOT: (args) => {
    if (args.length !== 1) return fail("#VALUE!");
    const test = truthy(scalar(args[0]));
    return isError(test) ? test : !test;
  },
  ROUND: numeric((value, digits = 0) => round(value, Math.trunc(digits), "half"), [1, 2]),
  ROUNDUP: numeric((value, digits = 0) => round(value, Math.trunc(digits), "up"), [1, 2]),
  ROUNDDOWN: numeric((value, digits = 0) => round(value, Math.trunc(digits), "down"), [1, 2]),
  INT: numeric((value) => Math.floor(value), [1, 1]),
  ABS: numeric((value) => Math.abs(value), [1, 1]),
  MOD: numeric(
    (value, divisor) => (divisor === 0 ? fail("#DIV/0!") : value - divisor * Math.floor(value / divisor)),
    [2, 2],
  ),
  POWER: numeric((value, exponent) => value ** exponent, [2, 2]),
  SQRT: numeric((value) => (value < 0 ? fail("#NUM!") : Math.sqrt(value)), [1, 1]),
  CONCAT: (args) => {
    const values = flat(args);
    const problem = values.find(isError);
    return problem ?? values.map(toText).join("");
  },
  LEN: textual((text) => text.length, [1, 1]),
  UPPER: textual((text) => text.toLocaleUpperCase("de-CH"), [1, 1]),
  LOWER: textual((text) => text.toLocaleLowerCase("de-CH"), [1, 1]),
  TRIM: textual((text) => text.trim().replace(/\s+/g, " "), [1, 1]),
  LEFT: textual((text, count = 1) => (count < 0 ? fail("#VALUE!") : text.slice(0, count)), [1, 2]),
  RIGHT: textual((text, count = 1) => (count < 0 ? fail("#VALUE!") : count === 0 ? "" : text.slice(-count)), [1, 2]),
  MID: textual(
    (text, start, count) => (start < 1 || count < 0 ? fail("#VALUE!") : text.slice(start - 1, start - 1 + count)),
    [3, 3],
  ),
  TODAY: (args, resolver) => (args.length ? fail("#VALUE!") : (resolver.today?.() ?? todaySerial())),
  NOW: (args, resolver) => {
    if (args.length) return fail("#VALUE!");
    if (resolver.now) return resolver.now();
    const now = new Date();
    return todaySerial(now) + (now.getHours() * 60 + now.getMinutes()) / 1440;
  },
  DATE: numeric((year, month, day) => dateSerial(Math.trunc(year), Math.trunc(month), Math.trunc(day)), [3, 3]),
  YEAR: numeric((serial) => serialDate(serial).year, [1, 1]),
  MONTH: numeric((serial) => serialDate(serial).month, [1, 1]),
  DAY: numeric((serial) => serialDate(serial).day, [1, 1]),
  ISBLANK: (args) => args.length === 1 && scalar(args[0]) === null,
  ISNUMBER: (args) => args.length === 1 && typeof scalar(args[0]) === "number",
  ISTEXT: (args) => args.length === 1 && typeof scalar(args[0]) === "string",
  ISERROR: (args) => args.length === 1 && isError(scalar(args[0])),
  VLOOKUP: (args) => {
    if (args.length < 3 || args.length > 4 || !isGrid(args[1])) return fail("#VALUE!");
    const key = scalar(args[0]);
    if (isError(key)) return key;
    const column = toNumber(scalar(args[2]));
    if (isError(column)) return column;
    const table = args[1];
    if (column < 1 || column > (table[0]?.length ?? 0)) return fail("#REF!");
    const approximate = args.length < 4 ? true : truthy(scalar(args[3]));
    if (isError(approximate)) return approximate;
    if (!approximate) {
      const row = table.find((line) => line[0] !== null && compare(line[0], key) === 0);
      return row ? row[Math.trunc(column) - 1] : fail("#N/A");
    }
    let found: Value[] | null = null;
    for (const line of table) {
      if (line[0] === null) continue;
      if (compare(line[0], key) <= 0) found = line;
      else break;
    }
    return found ? found[Math.trunc(column) - 1] : fail("#N/A");
  },
};

// ---------- Weitere Funktionen (wie Excel) ----------

const numberArg = (arg: Arg | undefined, fallback?: number): number | CellError =>
  arg === undefined ? (fallback ?? fail("#VALUE!")) : toNumber(scalar(arg));
const textArg = (arg: Arg | undefined, fallback = ""): string | CellError => {
  if (arg === undefined) return fallback;
  const value = scalar(arg);
  return isError(value) ? value : toText(value);
};
const toGrid = (arg: Arg): Grid => (isGrid(arg) ? arg : [[arg]]);
// Eine Zeile oder Spalte als Liste (für VERGLEICH, XVERWEIS & Co.).
const vector = (arg: Arg): Value[] | null =>
  !isGrid(arg)
    ? [arg]
    : arg.length === 1
      ? arg[0]
      : arg.every((line) => line.length === 1)
        ? arg.map((line) => line[0])
        : null;
const wildcard = (pattern: string) =>
  new RegExp(
    `^${pattern.replace(/~([*?~])|([.+^${}()|[\]\\])|(\*)|(\?)/g, (_, escaped, special, star, question) =>
      escaped ? `\\${escaped}` : special ? `\\${special}` : star ? ".*" : question ? "." : "",
    )}$`,
    "i",
  );
// Genaue Übereinstimmung beim Nachschlagen (Text ohne Gross-/Kleinschreibung, optional mit * und ?).
function matcher(key: Value, wildcards: boolean): (value: Value) => boolean {
  if (wildcards && typeof key === "string" && /[*?]/.test(key)) {
    const pattern = wildcard(key);
    return (value) => typeof value === "string" && pattern.test(value);
  }
  return (value) => value !== null && !isError(value) && typeof value === typeof key && compare(value, key) === 0;
}
// Position in einer Liste: 0 = genau, 1 = grösster Wert ≤ Suchwert (aufsteigend), -1 = kleinster Wert ≥ Suchwert.
function position(list: Value[], key: Value, mode: number, wildcards = true): number {
  if (mode === 0) return list.findIndex(matcher(key, wildcards));
  let found = -1;
  for (let index = 0; index < list.length; index += 1) {
    const value = list[index];
    if (value === null || isError(value) || typeof value !== typeof key) continue;
    const result = compare(value, key);
    if (mode > 0 ? result <= 0 : result >= 0) found = index;
    else break;
  }
  return found;
}

function multiConditional(args: Arg[], mode: "sum" | "count" | "average" | "max" | "min"): Value {
  const target = mode === "count" ? null : args[0];
  const pairs = mode === "count" ? args : args.slice(1);
  if (pairs.length < 2 || pairs.length % 2 || (target !== null && !isGrid(target))) return fail("#VALUE!");
  const ranges: Grid[] = [];
  const tests: ((value: Value) => boolean)[] = [];
  for (let index = 0; index < pairs.length; index += 2) {
    const range = pairs[index];
    const raw = scalar(pairs[index + 1]);
    if (!isGrid(range)) return fail("#VALUE!");
    if (isError(raw)) return raw;
    ranges.push(range);
    tests.push(criterion(raw));
  }
  const shape = target ?? ranges[0];
  const width = shape[0]?.length ?? 0;
  if (ranges.some((range) => range.length !== shape.length || (range[0]?.length ?? 0) !== width))
    return fail("#VALUE!");
  let count = 0;
  const hits: number[] = [];
  shape.forEach((line, r) =>
    line.forEach((value, c) => {
      if (!tests.every((test, k) => test(ranges[k][r][c]))) return;
      count += 1;
      if (target !== null && typeof value === "number") hits.push(value);
    }),
  );
  if (mode === "count") return count;
  if (mode === "sum") return hits.reduce((a, b) => a + b, 0);
  if (mode === "average") return hits.length ? hits.reduce((a, b) => a + b, 0) / hits.length : fail("#DIV/0!");
  if (!hits.length) return 0;
  return mode === "max" ? Math.max(...hits) : Math.min(...hits);
}

function deviation(values: number[], sample: boolean): number | CellError {
  if (values.length < (sample ? 2 : 1)) return fail("#DIV/0!");
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - (sample ? 1 : 0));
}
const precise = (value: number) => Number(value.toPrecision(15));

// Wochentag 0 = Sonntag … 6 = Samstag.
const dayOfWeek = (serial: number) => new Date(EPOCH + Math.floor(serial) * DAY).getUTCDay();
const lastDayOfMonth = (year: number, month: number) => serialDate(dateSerial(year, month + 1, 0)).day;
function addMonths(serial: number, months: number) {
  const { year, month, day } = serialDate(serial);
  const target = month + Math.trunc(months);
  return dateSerial(year, target, Math.min(day, lastDayOfMonth(year, target)));
}
// Erster Wochentag je Typ von WOCHENTAG/KALENDERWOCHE (0 = Sonntag).
const WEEK_START: Record<number, number> = { 1: 0, 2: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 0 };
function isoWeek(serial: number) {
  const day = Math.floor(serial);
  const thursday = day - ((dayOfWeek(day) + 6) % 7) + 3;
  const year = serialDate(thursday).year;
  return Math.floor((thursday - dateSerial(year, 1, 1)) / 7) + 1;
}
const isWorkday = (serial: number, holidays: Set<number>) => {
  const day = dayOfWeek(serial);
  return day !== 0 && day !== 6 && !holidays.has(Math.floor(serial));
};
function holidayList(arg: Arg | undefined): Set<number> | CellError {
  const set = new Set<number>();
  if (arg === undefined) return set;
  for (const value of toGrid(arg).flat()) {
    if (isError(value)) return value;
    if (value === null || value === "") continue;
    const number = toNumber(value);
    if (isError(number)) return number;
    set.add(Math.floor(number));
  }
  return set;
}
const secondsOf = (serial: number) => Math.round((serial - Math.floor(serial)) * 86_400) % 86_400;

const WEEKDAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// Formatcode von TEXT(): Abschnitte „positiv;negativ;null;Text“, Zahlen (0, #, Tausender- und Dezimalzeichen,
// %), Datum und Zeit (TT/DD, MM, MMM, MMMM, JJJJ/YYYY, hh, mm, ss), Text in Anführungszeichen.
type CodePart = { lit: string } | { pat: string };
function codeParts(section: string): CodePart[] {
  const parts: CodePart[] = [];
  const literal = (text: string) => {
    const last = parts[parts.length - 1];
    if (last && "lit" in last) last.lit += text;
    else parts.push({ lit: text });
  };
  for (let i = 0; i < section.length; i += 1) {
    const char = section[i];
    if (char === '"') {
      const close = section.indexOf('"', i + 1);
      literal(section.slice(i + 1, close < 0 ? undefined : close));
      i = close < 0 ? section.length : close;
    } else if (char === "\\") {
      literal(section[i + 1] ?? "");
      i += 1;
    } else if ("0#?".includes(char) || (".,".includes(char) && /[0#?]/.test(section[i + 1] ?? ""))) {
      let pattern = "";
      while (i < section.length && /[0#?.,'’]/.test(section[i])) pattern += section[i++];
      // Ein Trennzeichen am Ende („0.“) gehört nicht mehr zur Zahl.
      const trailing = /[.,'’]+$/.exec(pattern)?.[0] ?? "";
      parts.push({ pat: pattern.slice(0, pattern.length - trailing.length) });
      if (trailing) literal(trailing);
      i -= 1;
    } else literal(char);
  }
  return parts;
}
function formatNumberPattern(value: number, pattern: string) {
  const separators = [...pattern].filter((char) => ".,'’".includes(char));
  let decimal = "";
  let thousands = "";
  const marks = [...new Set(separators.filter((char) => char === "." || char === ","))];
  if (separators.some((char) => char === "'" || char === "’")) {
    thousands = separators.find((char) => char === "'" || char === "’")!;
    decimal = marks[0] ?? "";
  } else if (marks.length === 2) {
    decimal = pattern.lastIndexOf(".") > pattern.lastIndexOf(",") ? "." : ",";
    thousands = decimal === "." ? "," : ".";
  } else if (marks.length === 1) {
    const mark = marks[0];
    const tail = pattern.slice(pattern.lastIndexOf(mark) + 1);
    // „#,##0“ gruppiert Tausender, „0,00“ trennt Dezimalstellen.
    if ((pattern[pattern.indexOf(mark) - 1] === "#" && tail.length === 3) || separators.length > 1) thousands = mark;
    else decimal = mark;
  }
  const decimalAt = decimal ? pattern.lastIndexOf(decimal) : -1;
  const intPattern = (decimalAt < 0 ? pattern : pattern.slice(0, decimalAt)).replace(/[.,'’]/g, "");
  const decPattern = decimalAt < 0 ? "" : pattern.slice(decimalAt + 1).replace(/[.,'’]/g, "");
  const places = decPattern.length;
  const minPlaces = decPattern.replace(/[#?]+$/, "").length;
  const fixed = Math.abs(value).toFixed(places);
  let [whole, fraction = ""] = fixed.split(".");
  while (fraction.length > minPlaces && fraction.endsWith("0")) fraction = fraction.slice(0, -1);
  const minWhole = intPattern.replace(/^[#?]+/, "").length;
  if (whole === "0" && minWhole === 0) whole = "";
  whole = whole.padStart(minWhole, "0");
  if (thousands) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return whole + (fraction || (places && minPlaces) ? `${decimal}${fraction}` : "");
}
function formatDatePart(serial: number, section: string) {
  type Piece = { kind: "lit"; text: string } | { kind: "y" | "d" | "m" | "h" | "s"; size: number };
  const pieces: Piece[] = [];
  for (let i = 0; i < section.length;) {
    const rest = section.slice(i);
    const char = rest[0];
    if (char === '"') {
      const close = section.indexOf('"', i + 1);
      pieces.push({ kind: "lit", text: section.slice(i + 1, close < 0 ? undefined : close) });
      i = close < 0 ? section.length : close + 1;
      continue;
    }
    if (char === "\\") {
      pieces.push({ kind: "lit", text: rest[1] ?? "" });
      i += 2;
      continue;
    }
    const run = /^([JjYy]+|[TtDd]+|[Mm]+|[Hh]+|[Ss]+)/.exec(rest);
    if (run) {
      const letter = run[1][0].toLowerCase();
      const kind =
        letter === "j" || letter === "y" ? "y" : letter === "t" || letter === "d" ? "d" : (letter as "m" | "h" | "s");
      pieces.push({ kind, size: run[1].length });
      i += run[1].length;
      continue;
    }
    pieces.push({ kind: "lit", text: char });
    i += 1;
  }
  const date = serialDate(serial);
  const seconds = secondsOf(serial);
  const units = pieces.filter((piece) => piece.kind !== "lit");
  return pieces
    .map((piece) => {
      if (piece.kind === "lit") return piece.text;
      const at = units.indexOf(piece);
      const minute =
        piece.kind === "m" && piece.size <= 2 && (units[at - 1]?.kind === "h" || units[at + 1]?.kind === "s");
      switch (piece.kind) {
        case "y":
          return piece.size <= 2 ? String(date.year % 100).padStart(2, "0") : String(date.year);
        case "d":
          if (piece.size >= 4) return WEEKDAY_NAMES[dayOfWeek(serial)];
          if (piece.size === 3) return WEEKDAY_NAMES[dayOfWeek(serial)].slice(0, 2);
          return String(date.day).padStart(piece.size, "0");
        case "m":
          if (minute) return String(Math.floor(seconds / 60) % 60).padStart(piece.size, "0");
          if (piece.size >= 4) return MONTH_NAMES[date.month - 1];
          if (piece.size === 3) return MONTH_NAMES[date.month - 1].slice(0, 3);
          return String(date.month).padStart(piece.size, "0");
        case "h":
          return String(Math.floor(seconds / 3600)).padStart(Math.min(2, piece.size), "0");
        case "s":
          return String(seconds % 60).padStart(Math.min(2, piece.size), "0");
      }
    })
    .join("");
}
export function formatWithCode(value: Value, code: string): string | CellError {
  if (isError(value)) return value;
  const sections: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of code) {
    if (char === '"') quoted = !quoted;
    if (char === ";" && !quoted) {
      sections.push(current);
      current = "";
    } else current += char;
  }
  sections.push(current);
  let number = typeof value === "number" ? value : null;
  if (typeof value === "string") {
    const parsed = parseInput(value);
    if (parsed.type === "number") number = parsed.value;
  }
  if (number === null) {
    const text = toText(value);
    const section = sections[3] ?? sections.find((item) => item.includes("@"));
    if (!section) return text;
    return codeParts(section)
      .map((part) => ("lit" in part ? part.lit : part.pat))
      .join("")
      .replace(/@/g, text);
  }
  let section = sections[0];
  let sign = number < 0 ? "-" : "";
  if (number < 0 && sections[1] !== undefined) {
    section = sections[1];
    sign = "";
  } else if (number === 0 && sections[2] !== undefined) section = sections[2];
  const unquoted = section.replace(/"[^"]*"/g, "").replace(/\\./g, "");
  if (!/[0#?]/.test(unquoted) && /[JjYyTtDdMmHhSs]/.test(unquoted)) return formatDatePart(Math.abs(number), section);
  const parts = codeParts(section);
  const percents = parts.reduce((sum, part) => sum + ("lit" in part ? (part.lit.match(/%/g) ?? []).length : 0), 0);
  const scaled = Math.abs(number) * 100 ** percents;
  let used = false;
  const body = parts
    .map((part) => {
      if ("lit" in part) return part.lit;
      if (used) return "";
      used = true;
      return formatNumberPattern(scaled, part.pat);
    })
    .join("");
  return used && /[1-9]/.test(body) ? sign + body : body;
}

Object.assign(FUNCTIONS, {
  SUMIFS: (args) => multiConditional(args, "sum"),
  COUNTIFS: (args) => multiConditional(args, "count"),
  AVERAGEIFS: (args) => multiConditional(args, "average"),
  MAXIFS: (args) => multiConditional(args, "max"),
  MINIFS: (args) => multiConditional(args, "min"),
  IFNA: (args) => {
    if (args.length !== 2) return fail("#VALUE!");
    const value = scalar(args[0]);
    return isError(value) && value.error === "#N/A" ? scalar(args[1]) : value;
  },
  IFS: (args) => {
    if (args.length < 2 || args.length % 2) return fail("#VALUE!");
    for (let index = 0; index < args.length; index += 2) {
      const test = truthy(scalar(args[index]));
      if (isError(test)) return test;
      if (test) return scalar(args[index + 1]);
    }
    return fail("#N/A");
  },
  SWITCH: (args) => {
    if (args.length < 3) return fail("#VALUE!");
    const value = scalar(args[0]);
    if (isError(value)) return value;
    const pairs = args.slice(1);
    for (let index = 0; index + 1 < pairs.length; index += 2) {
      const candidate = scalar(pairs[index]);
      if (isError(candidate)) return candidate;
      if (typeof candidate === typeof value && compare(candidate, value) === 0) return scalar(pairs[index + 1]);
    }
    return pairs.length % 2 ? scalar(pairs[pairs.length - 1]) : fail("#N/A");
  },
  CHOOSE: (args) => {
    const index = numberArg(args[0]);
    if (isError(index)) return index;
    const choice = Math.trunc(index);
    return choice < 1 || choice >= args.length ? fail("#VALUE!") : scalar(args[choice]);
  },
  XOR: (args) => {
    const values = flat(args).filter((value) => value !== null);
    if (!values.length) return fail("#VALUE!");
    let count = 0;
    for (const value of values) {
      const test = truthy(value);
      if (isError(test)) return test;
      if (test) count += 1;
    }
    return count % 2 === 1;
  },
  NA: (args) => (args.length ? fail("#VALUE!") : fail("#N/A")),
  MATCH: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const key = scalar(args[0]);
    if (isError(key)) return key;
    const list = vector(args[1]);
    if (!list) return fail("#N/A");
    const mode = numberArg(args[2], 1);
    if (isError(mode)) return mode;
    const found = position(list, key, Math.sign(Math.trunc(mode)));
    return found < 0 ? fail("#N/A") : found + 1;
  },
  INDEX: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const grid = toGrid(args[0]);
    const first = numberArg(args[1]);
    if (isError(first)) return first;
    const second = numberArg(args[2], 0);
    if (isError(second)) return second;
    let row = Math.trunc(first);
    let col = Math.trunc(second);
    // Bei einer einzelnen Zeile meint die erste Zahl die Spalte (wie Excel).
    if (args.length === 2 && grid.length === 1) [row, col] = [1, row];
    if (row === 0 && grid.length === 1) row = 1;
    if (col === 0 && (grid[0]?.length ?? 0) === 1) col = 1;
    if (row < 1 || col < 1 || row > grid.length || col > (grid[0]?.length ?? 0)) return fail("#REF!");
    return grid[row - 1][col - 1];
  },
  XLOOKUP: (args) => {
    if (args.length < 3 || args.length > 6) return fail("#VALUE!");
    const key = scalar(args[0]);
    if (isError(key)) return key;
    const list = vector(args[1]);
    const results = toGrid(args[2]);
    if (!list) return fail("#VALUE!");
    const mode = numberArg(args[4], 0);
    const direction = numberArg(args[5], 1);
    if (isError(mode)) return mode;
    if (isError(direction)) return direction;
    const indexes = list.map((_, index) => index);
    if (direction < 0) indexes.reverse();
    let found = -1;
    if (mode === 0 || mode === 2) {
      const test = matcher(key, mode === 2);
      found = indexes.find((index) => test(list[index])) ?? -1;
    } else {
      // Genau oder nächstkleiner (-1) bzw. nächstgrösser (1), unabhängig von der Sortierung.
      let best: Value = null;
      for (const index of indexes) {
        const value = list[index];
        if (value === null || isError(value) || typeof value !== typeof key) continue;
        const result = compare(value, key);
        if (result === 0) {
          found = index;
          break;
        }
        if (
          (mode < 0 ? result < 0 : result > 0) &&
          (best === null || (mode < 0 ? compare(value, best) > 0 : compare(value, best) < 0))
        ) {
          best = value;
          found = index;
        }
      }
    }
    if (found < 0) return args[3] !== undefined ? scalar(args[3]) : fail("#N/A");
    if (results.length === list.length) return results[found][0];
    return results.length === 1 && (results[0]?.length ?? 0) === list.length ? results[0][found] : fail("#VALUE!");
  },
  HLOOKUP: (args, resolver) => {
    if (args.length < 3 || args.length > 4 || !isGrid(args[1])) return fail("#VALUE!");
    const table = args[1];
    const transposed: Grid = (table[0] ?? []).map((_, c) => table.map((line) => line[c]));
    return FUNCTIONS.VLOOKUP([args[0], transposed, ...args.slice(2)], resolver);
  },
  LARGE: (args) => {
    if (args.length !== 2) return fail("#VALUE!");
    const values = numbers([args[0]]);
    const k = numberArg(args[1]);
    if (isError(values)) return values;
    if (isError(k)) return k;
    const sorted = [...values].sort((a, b) => b - a);
    const at = Math.ceil(k);
    return at < 1 || at > sorted.length ? fail("#NUM!") : sorted[at - 1];
  },
  SMALL: (args) => {
    if (args.length !== 2) return fail("#VALUE!");
    const values = numbers([args[0]]);
    const k = numberArg(args[1]);
    if (isError(values)) return values;
    if (isError(k)) return k;
    const sorted = [...values].sort((a, b) => a - b);
    const at = Math.ceil(k);
    return at < 1 || at > sorted.length ? fail("#NUM!") : sorted[at - 1];
  },
  RANK: (args) => {
    if (args.length < 2 || args.length > 3 || !isGrid(args[1])) return fail("#VALUE!");
    const value = numberArg(args[0]);
    const order = numberArg(args[2], 0);
    const values = numbers([args[1]]);
    if (isError(value)) return value;
    if (isError(order)) return order;
    if (isError(values)) return values;
    if (!values.includes(value)) return fail("#N/A");
    return 1 + values.filter((other) => (order ? other < value : other > value)).length;
  },
  MODE: aggregate((values) => {
    const counts = new Map<number, number>();
    let best: number | null = null;
    for (const value of values) {
      const count = (counts.get(value) ?? 0) + 1;
      counts.set(value, count);
      if (count > 1 && (best === null || count > counts.get(best)!)) best = value;
    }
    return best ?? fail("#N/A");
  }),
  STDEV: aggregate((values) => {
    const variance = deviation(values, true);
    return isError(variance) ? variance : Math.sqrt(variance);
  }),
  "STDEV.P": aggregate((values) => {
    const variance = deviation(values, false);
    return isError(variance) ? variance : Math.sqrt(variance);
  }),
  VAR: aggregate((values) => deviation(values, true)),
  "VAR.P": aggregate((values) => deviation(values, false)),
  SUMPRODUCT: (args) => {
    if (!args.length) return fail("#VALUE!");
    const grids = args.map(toGrid);
    const height = grids[0].length;
    const width = grids[0][0]?.length ?? 0;
    if (grids.some((grid) => grid.length !== height || (grid[0]?.length ?? 0) !== width)) return fail("#VALUE!");
    let sum = 0;
    for (let r = 0; r < height; r += 1)
      for (let c = 0; c < width; c += 1) {
        let product = 1;
        for (const grid of grids) {
          const value = grid[r][c];
          if (isError(value)) return value;
          product *= typeof value === "number" ? value : 0;
        }
        sum += product;
      }
    return sum;
  },
  SUMSQ: aggregate((values) => values.reduce((sum, value) => sum + value * value, 0)),
  CEILING: numeric(
    (value, step = 1) => {
      if (step === 0) return 0;
      if (value > 0 && step < 0) return fail("#NUM!");
      return precise(Math.ceil(precise(value / step)) * step);
    },
    [1, 2],
  ),
  FLOOR: numeric(
    (value, step = 1) => {
      if (step === 0) return value === 0 ? 0 : fail("#DIV/0!");
      if (value > 0 && step < 0) return fail("#NUM!");
      return precise(Math.floor(precise(value / step)) * step);
    },
    [1, 2],
  ),
  MROUND: numeric(
    (value, step) => {
      if (step === 0) return 0;
      if (Math.sign(value) * Math.sign(step) < 0) return fail("#NUM!");
      return precise(round(value / step, 0, "half") * step);
    },
    [2, 2],
  ),
  TRUNC: numeric((value, digits = 0) => round(value, Math.trunc(digits), "down"), [1, 2]),
  EVEN: numeric((value) => Math.sign(value) * Math.ceil(Math.abs(value) / 2) * 2, [1, 1]),
  ODD: numeric(
    (value) => {
      const up = Math.ceil(Math.abs(value));
      return Math.sign(value || 1) * (up % 2 ? up : up + 1);
    },
    [1, 1],
  ),
  SIGN: numeric((value) => Math.sign(value), [1, 1]),
  PI: numeric(() => Math.PI, [0, 0]),
  EXP: numeric((value) => Math.exp(value), [1, 1]),
  LN: numeric((value) => (value <= 0 ? fail("#NUM!") : Math.log(value)), [1, 1]),
  LOG10: numeric((value) => (value <= 0 ? fail("#NUM!") : Math.log10(value)), [1, 1]),
  LOG: numeric(
    (value, base = 10) =>
      value <= 0 || base <= 0 || base === 1 ? fail("#NUM!") : precise(Math.log(value) / Math.log(base)),
    [1, 2],
  ),
  QUOTIENT: numeric((value, divisor) => (divisor === 0 ? fail("#DIV/0!") : Math.trunc(value / divisor)), [2, 2]),
  GCD: aggregate((values) => {
    if (values.some((value) => value < 0)) return fail("#NUM!");
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    return values.map(Math.trunc).reduce(gcd, 0);
  }),
  LCM: aggregate((values) => {
    if (values.some((value) => value < 0)) return fail("#NUM!");
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    return values.map(Math.trunc).reduce((a, b) => (a === 0 || b === 0 ? 0 : (a * b) / gcd(a, b)), 1);
  }),
  SIN: numeric((value) => Math.sin(value), [1, 1]),
  COS: numeric((value) => Math.cos(value), [1, 1]),
  TAN: numeric((value) => Math.tan(value), [1, 1]),
  RADIANS: numeric((value) => (value * Math.PI) / 180, [1, 1]),
  DEGREES: numeric((value) => (value * 180) / Math.PI, [1, 1]),
  RAND: numeric(() => Math.random(), [0, 0]),
  RANDBETWEEN: numeric(
    (low, high) => {
      const min = Math.ceil(low);
      const max = Math.floor(high);
      return min > max ? fail("#NUM!") : min + Math.floor(Math.random() * (max - min + 1));
    },
    [2, 2],
  ),
  SUBSTITUTE: (args) => {
    if (args.length < 3 || args.length > 4) return fail("#VALUE!");
    const [text, from, to] = [textArg(args[0]), textArg(args[1]), textArg(args[2])];
    if (isError(text)) return text;
    if (isError(from)) return from;
    if (isError(to)) return to;
    if (!from) return text;
    if (args[3] === undefined) return text.split(from).join(to);
    const instance = numberArg(args[3]);
    if (isError(instance)) return instance;
    if (instance < 1) return fail("#VALUE!");
    let at = -1;
    for (let count = 0; count < Math.trunc(instance); count += 1) {
      at = text.indexOf(from, at + 1);
      if (at < 0) return text;
    }
    return text.slice(0, at) + to + text.slice(at + from.length);
  },
  REPLACE: (args) => {
    if (args.length !== 4) return fail("#VALUE!");
    const text = textArg(args[0]);
    const start = numberArg(args[1]);
    const count = numberArg(args[2]);
    const insert = textArg(args[3]);
    if (isError(text)) return text;
    if (isError(start)) return start;
    if (isError(count)) return count;
    if (isError(insert)) return insert;
    if (start < 1 || count < 0) return fail("#VALUE!");
    return text.slice(0, Math.trunc(start) - 1) + insert + text.slice(Math.trunc(start) - 1 + Math.trunc(count));
  },
  FIND: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const find = textArg(args[0]);
    const within = textArg(args[1]);
    const start = numberArg(args[2], 1);
    if (isError(find)) return find;
    if (isError(within)) return within;
    if (isError(start)) return start;
    if (start < 1 || start > within.length + 1) return fail("#VALUE!");
    const at = within.indexOf(find, Math.trunc(start) - 1);
    return at < 0 ? fail("#VALUE!") : at + 1;
  },
  SEARCH: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const find = textArg(args[0]);
    const within = textArg(args[1]);
    const start = numberArg(args[2], 1);
    if (isError(find)) return find;
    if (isError(within)) return within;
    if (isError(start)) return start;
    if (start < 1 || start > within.length + 1) return fail("#VALUE!");
    const source = wildcard(find).source.slice(1, -1);
    const match = new RegExp(source, "i").exec(within.slice(Math.trunc(start) - 1));
    return match ? match.index + Math.trunc(start) : fail("#VALUE!");
  },
  TEXTJOIN: (args) => {
    if (args.length < 3) return fail("#VALUE!");
    const separator = textArg(args[0]);
    const skip = truthy(scalar(args[1]));
    if (isError(separator)) return separator;
    if (isError(skip)) return skip;
    const values = flat(args.slice(2));
    const problem = values.find(isError);
    if (problem) return problem;
    return values
      .map(toText)
      .filter((text) => !skip || text !== "")
      .join(separator);
  },
  VALUE: (args) => {
    if (args.length !== 1) return fail("#VALUE!");
    const value = scalar(args[0]);
    if (isError(value) || typeof value === "number") return value;
    const parsed = parseInput(toText(value).trim());
    return parsed.type === "number" ? parsed.value : parsed.type === "empty" ? 0 : fail("#VALUE!");
  },
  PROPER: textual(
    (text) =>
      text
        .toLocaleLowerCase("de-CH")
        .replace(
          /(^|[^\p{L}])(\p{L})/gu,
          (_, before: string, letter: string) => before + letter.toLocaleUpperCase("de-CH"),
        ),
    [1, 1],
  ),
  REPT: textual(
    (text, count) => (count < 0 || text.length * count > 32_767 ? fail("#VALUE!") : text.repeat(Math.trunc(count))),
    [2, 2],
  ),
  EXACT: (args) => {
    if (args.length !== 2) return fail("#VALUE!");
    const a = textArg(args[0]);
    const b = textArg(args[1]);
    if (isError(a)) return a;
    if (isError(b)) return b;
    return a === b;
  },
  TEXT: (args) => {
    if (args.length !== 2) return fail("#VALUE!");
    const value = scalar(args[0]);
    const code = textArg(args[1]);
    if (isError(code)) return code;
    return formatWithCode(value, code);
  },
  CHAR: numeric((code) => (code < 1 || code > 255 ? fail("#VALUE!") : String.fromCharCode(Math.trunc(code))), [1, 1]),
  CODE: textual((text) => (text ? text.charCodeAt(0) : fail("#VALUE!")), [1, 1]),
  CLEAN: textual((text) => text.replace(/[\u0000-\u001f]/g, ""), [1, 1]),
  WEEKDAY: (args) => {
    if (args.length < 1 || args.length > 2) return fail("#VALUE!");
    const serial = numberArg(args[0]);
    const type = numberArg(args[1], 1);
    if (isError(serial)) return serial;
    if (isError(type)) return type;
    const kind = Math.trunc(type);
    const start = kind === 3 ? 1 : WEEK_START[kind];
    if (start === undefined) return fail("#NUM!");
    const result = ((dayOfWeek(serial) - start + 7) % 7) + 1;
    return kind === 3 ? result - 1 : result;
  },
  WEEKNUM: (args) => {
    if (args.length < 1 || args.length > 2) return fail("#VALUE!");
    const serial = numberArg(args[0]);
    const type = numberArg(args[1], 1);
    if (isError(serial)) return serial;
    if (isError(type)) return type;
    if (Math.trunc(type) === 21) return isoWeek(serial);
    const start = WEEK_START[Math.trunc(type)];
    if (start === undefined || Math.trunc(type) === 3) return fail("#NUM!");
    const january = dateSerial(serialDate(serial).year, 1, 1);
    const offset = (dayOfWeek(january) - start + 7) % 7;
    return Math.floor((Math.floor(serial) - january + offset) / 7) + 1;
  },
  ISOWEEKNUM: numeric((serial) => isoWeek(serial), [1, 1]),
  DAYS: numeric((end, start) => Math.floor(end) - Math.floor(start), [2, 2]),
  EDATE: numeric((start, months) => addMonths(start, months), [2, 2]),
  EOMONTH: numeric(
    (start, months) => {
      const { year, month } = serialDate(start);
      return dateSerial(year, month + Math.trunc(months) + 1, 0);
    },
    [2, 2],
  ),
  NETWORKDAYS: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const start = numberArg(args[0]);
    const end = numberArg(args[1]);
    const holidays = holidayList(args[2]);
    if (isError(start)) return start;
    if (isError(end)) return end;
    if (isError(holidays)) return holidays;
    const [from, to] = [Math.floor(Math.min(start, end)), Math.floor(Math.max(start, end))];
    if (to - from > 200_000) return fail("#NUM!");
    let count = 0;
    for (let day = from; day <= to; day += 1) if (isWorkday(day, holidays)) count += 1;
    return start > end ? -count : count;
  },
  WORKDAY: (args) => {
    if (args.length < 2 || args.length > 3) return fail("#VALUE!");
    const start = numberArg(args[0]);
    const days = numberArg(args[1]);
    const holidays = holidayList(args[2]);
    if (isError(start)) return start;
    if (isError(days)) return days;
    if (isError(holidays)) return holidays;
    let remaining = Math.trunc(days);
    if (Math.abs(remaining) > 100_000) return fail("#NUM!");
    let day = Math.floor(start);
    const step = Math.sign(remaining);
    while (remaining !== 0) {
      day += step;
      if (isWorkday(day, holidays)) remaining -= step;
    }
    return day;
  },
  HOUR: numeric((serial) => Math.floor(secondsOf(serial) / 3600), [1, 1]),
  MINUTE: numeric((serial) => Math.floor(secondsOf(serial) / 60) % 60, [1, 1]),
  SECOND: numeric((serial) => secondsOf(serial) % 60, [1, 1]),
  TIME: numeric(
    (hours, minutes, seconds) => {
      const total = Math.trunc(hours) * 3600 + Math.trunc(minutes) * 60 + Math.trunc(seconds);
      return total < 0 ? fail("#NUM!") : (total % 86_400) / 86_400;
    },
    [3, 3],
  ),
  DATEVALUE: (args) => {
    const text = textArg(args[0]);
    if (isError(text)) return text;
    const parsed = parseInput(text.trim());
    return args.length === 1 && parsed.type === "number" && (parsed.format === "date" || parsed.format === "datetime")
      ? Math.floor(parsed.value)
      : fail("#VALUE!");
  },
  TIMEVALUE: (args) => {
    const text = textArg(args[0]);
    if (isError(text)) return text;
    const parsed = parseInput(text.trim());
    return args.length === 1 && parsed.type === "number" && (parsed.format === "time" || parsed.format === "datetime")
      ? parsed.value - Math.floor(parsed.value)
      : fail("#VALUE!");
  },
  DATEDIF: (args) => {
    if (args.length !== 3) return fail("#VALUE!");
    const startValue = numberArg(args[0]);
    const endValue = numberArg(args[1]);
    const unit = textArg(args[2]);
    if (isError(startValue)) return startValue;
    if (isError(endValue)) return endValue;
    if (isError(unit)) return unit;
    const [start, end] = [Math.floor(startValue), Math.floor(endValue)];
    if (start > end) return fail("#NUM!");
    const a = serialDate(start);
    const b = serialDate(end);
    const months = (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0);
    switch (unit.toUpperCase()) {
      case "D":
        return end - start;
      case "M":
        return months;
      case "Y":
        return Math.floor(months / 12);
      case "YM":
        return months % 12;
      case "MD":
        return b.day >= a.day ? b.day - a.day : lastDayOfMonth(b.year, b.month - 1) - a.day + b.day;
      case "YD": {
        let shifted = dateSerial(b.year, a.month, Math.min(a.day, lastDayOfMonth(b.year, a.month)));
        if (shifted > end)
          shifted = dateSerial(b.year - 1, a.month, Math.min(a.day, lastDayOfMonth(b.year - 1, a.month)));
        return end - shifted;
      }
      default:
        return fail("#NUM!");
    }
  },
  ISEVEN: numeric((value) => Math.trunc(value) % 2 === 0, [1, 1]),
  ISODD: numeric((value) => Math.abs(Math.trunc(value)) % 2 === 1, [1, 1]),
  ISLOGICAL: (args) => args.length === 1 && typeof scalar(args[0]) === "boolean",
  ISNONTEXT: (args) => args.length === 1 && typeof scalar(args[0]) !== "string",
  ISNA: (args) => {
    const value = args.length === 1 ? scalar(args[0]) : null;
    return isError(value) && value.error === "#N/A";
  },
  ISERR: (args) => {
    const value = args.length === 1 ? scalar(args[0]) : null;
    return isError(value) && value.error !== "#N/A";
  },
} satisfies Record<string, Impl>);

// Deutsche Namen (wie im deutschen Excel) → interne englische Namen; beide Schreibweisen funktionieren.
const GERMAN: Record<string, string> = {
  SUMME: "SUM",
  MITTELWERT: "AVERAGE",
  PRODUKT: "PRODUCT",
  ANZAHL: "COUNT",
  ANZAHL2: "COUNTA",
  ANZAHLLEEREZELLEN: "COUNTBLANK",
  SUMMEWENN: "SUMIF",
  ZÄHLENWENN: "COUNTIF",
  MITTELWERTWENN: "AVERAGEIF",
  WENN: "IF",
  WENNFEHLER: "IFERROR",
  UND: "AND",
  ODER: "OR",
  NICHT: "NOT",
  RUNDEN: "ROUND",
  AUFRUNDEN: "ROUNDUP",
  ABRUNDEN: "ROUNDDOWN",
  GANZZAHL: "INT",
  REST: "MOD",
  POTENZ: "POWER",
  WURZEL: "SQRT",
  VERKETTEN: "CONCAT",
  TEXTKETTE: "CONCAT",
  LÄNGE: "LEN",
  GROSS: "UPPER",
  KLEIN: "LOWER",
  GLÄTTEN: "TRIM",
  LINKS: "LEFT",
  RECHTS: "RIGHT",
  TEIL: "MID",
  HEUTE: "TODAY",
  JETZT: "NOW",
  DATUM: "DATE",
  JAHR: "YEAR",
  MONAT: "MONTH",
  TAG: "DAY",
  ISTLEER: "ISBLANK",
  ISTZAHL: "ISNUMBER",
  ISTTEXT: "ISTEXT",
  ISTFEHLER: "ISERROR",
  SVERWEIS: "VLOOKUP",
  SUMMEWENNS: "SUMIFS",
  ZÄHLENWENNS: "COUNTIFS",
  MITTELWERTWENNS: "AVERAGEIFS",
  MAXWENNS: "MAXIFS",
  MINWENNS: "MINIFS",
  WENNNV: "IFNA",
  WENNS: "IFS",
  ERSTERWERT: "SWITCH",
  WAHL: "CHOOSE",
  XODER: "XOR",
  NV: "NA",
  VERGLEICH: "MATCH",
  XVERWEIS: "XLOOKUP",
  WVERWEIS: "HLOOKUP",
  ZEILE: "ROW",
  SPALTE: "COLUMN",
  ZEILEN: "ROWS",
  SPALTEN: "COLUMNS",
  KGRÖSSTE: "LARGE",
  KKLEINSTE: "SMALL",
  RANG: "RANK",
  "RANG.GLEICH": "RANK",
  MODALWERT: "MODE",
  "MODUS.EINF": "MODE",
  STABW: "STDEV",
  "STABW.S": "STDEV",
  "STABW.N": "STDEV.P",
  VARIANZ: "VAR",
  "VAR.S": "VAR",
  SUMMENPRODUKT: "SUMPRODUCT",
  QUADRATESUMME: "SUMSQ",
  OBERGRENZE: "CEILING",
  UNTERGRENZE: "FLOOR",
  VRUNDEN: "MROUND",
  KÜRZEN: "TRUNC",
  GERADE: "EVEN",
  UNGERADE: "ODD",
  VORZEICHEN: "SIGN",
  GGT: "GCD",
  KGV: "LCM",
  BOGENMASS: "RADIANS",
  GRAD: "DEGREES",
  ZUFALLSZAHL: "RAND",
  ZUFALLSBEREICH: "RANDBETWEEN",
  WECHSELN: "SUBSTITUTE",
  ERSETZEN: "REPLACE",
  FINDEN: "FIND",
  SUCHEN: "SEARCH",
  TEXTVERKETTEN: "TEXTJOIN",
  WERT: "VALUE",
  GROSS2: "PROPER",
  WIEDERHOLEN: "REPT",
  IDENTISCH: "EXACT",
  ZEICHEN: "CHAR",
  SÄUBERN: "CLEAN",
  WOCHENTAG: "WEEKDAY",
  KALENDERWOCHE: "WEEKNUM",
  ISOKALENDERWOCHE: "ISOWEEKNUM",
  TAGE: "DAYS",
  EDATUM: "EDATE",
  MONATSENDE: "EOMONTH",
  NETTOARBEITSTAGE: "NETWORKDAYS",
  ARBEITSTAG: "WORKDAY",
  STUNDE: "HOUR",
  SEKUNDE: "SECOND",
  ZEIT: "TIME",
  DATWERT: "DATEVALUE",
  ZEITWERT: "TIMEVALUE",
  ISTGERADE: "ISEVEN",
  ISTUNGERADE: "ISODD",
  ISTLOG: "ISLOGICAL",
  ISTKTEXT: "ISNONTEXT",
  ISTNV: "ISNA",
  ISTFEHL: "ISERR",
};
const ENGLISH_ALIASES: Record<string, string> = {
  CONCATENATE: "CONCAT",
  "RANK.EQ": "RANK",
  "MODE.SNGL": "MODE",
  "STDEV.S": "STDEV",
  "VAR.S": "VAR",
};
// Neuere Excel-Funktionen stehen in der Datei mit Vorsilbe „_xlfn.“ („_xlfn.XLOOKUP“).
const canonical = (name: string) => {
  const bare = name.replace(/^_XLFN\.(_XLWS\.)?/, "");
  return GERMAN[bare] ?? ENGLISH_ALIASES[bare] ?? bare;
};
const XLFN = new Set([
  "CONCAT",
  "TEXTJOIN",
  "IFS",
  "IFNA",
  "SWITCH",
  "XOR",
  "MAXIFS",
  "MINIFS",
  "XLOOKUP",
  "DAYS",
  "ISOWEEKNUM",
  "STDEV.P",
  "VAR.P",
]);
// Nur die üblichen deutschen Namen zurückübersetzen (nicht die Nebenformen).
const GERMAN_OF = Object.fromEntries(
  Object.entries(GERMAN)
    .filter(([german]) => !["TEXTKETTE", "RANG.GLEICH", "MODUS.EINF", "STABW.S", "VAR.S"].includes(german))
    .map(([german, english]) => [english, german]),
);

// Funktionen für die Hilfe in der Formelleiste (deutsche Namen, kurze Beschreibung).
export const FUNCTION_HELP: { name: string; syntax: string; text: string }[] = [
  { name: "SUMME", syntax: "SUMME(Zahl1; Zahl2; …)", text: "Addiert Zahlen oder Bereiche" },
  { name: "MITTELWERT", syntax: "MITTELWERT(Zahl1; …)", text: "Durchschnitt" },
  { name: "MIN", syntax: "MIN(Zahl1; …)", text: "Kleinster Wert" },
  { name: "MAX", syntax: "MAX(Zahl1; …)", text: "Grösster Wert" },
  { name: "MEDIAN", syntax: "MEDIAN(Zahl1; …)", text: "Mittlerer Wert" },
  { name: "PRODUKT", syntax: "PRODUKT(Zahl1; …)", text: "Multipliziert Zahlen" },
  { name: "ANZAHL", syntax: "ANZAHL(Wert1; …)", text: "Zählt Zellen mit Zahlen" },
  { name: "ANZAHL2", syntax: "ANZAHL2(Wert1; …)", text: "Zählt nicht leere Zellen" },
  { name: "ANZAHLLEEREZELLEN", syntax: "ANZAHLLEEREZELLEN(Bereich)", text: "Zählt leere Zellen" },
  { name: "ZÄHLENWENN", syntax: "ZÄHLENWENN(Bereich; Kriterium)", text: "Zählt Zellen, die eine Bedingung erfüllen" },
  { name: "SUMMEWENN", syntax: "SUMMEWENN(Bereich; Kriterium; [Summenbereich])", text: "Summe mit Bedingung" },
  {
    name: "MITTELWERTWENN",
    syntax: "MITTELWERTWENN(Bereich; Kriterium; [Bereich])",
    text: "Durchschnitt mit Bedingung",
  },
  { name: "WENN", syntax: "WENN(Prüfung; Dann; [Sonst])", text: "Wert abhängig von einer Bedingung" },
  { name: "WENNFEHLER", syntax: "WENNFEHLER(Wert; Ersatz)", text: "Ersatzwert bei einem Fehler" },
  { name: "UND", syntax: "UND(Wahrheitswert1; …)", text: "WAHR, wenn alle zutreffen" },
  { name: "ODER", syntax: "ODER(Wahrheitswert1; …)", text: "WAHR, wenn eine zutrifft" },
  { name: "NICHT", syntax: "NICHT(Wahrheitswert)", text: "Kehrt um" },
  { name: "RUNDEN", syntax: "RUNDEN(Zahl; Stellen)", text: "Kaufmännisch runden" },
  { name: "AUFRUNDEN", syntax: "AUFRUNDEN(Zahl; Stellen)", text: "Aufrunden" },
  { name: "ABRUNDEN", syntax: "ABRUNDEN(Zahl; Stellen)", text: "Abrunden" },
  { name: "GANZZAHL", syntax: "GANZZAHL(Zahl)", text: "Auf ganze Zahl abrunden" },
  { name: "ABS", syntax: "ABS(Zahl)", text: "Betrag ohne Vorzeichen" },
  { name: "REST", syntax: "REST(Zahl; Divisor)", text: "Rest einer Division" },
  { name: "POTENZ", syntax: "POTENZ(Zahl; Potenz)", text: "Potenz" },
  { name: "WURZEL", syntax: "WURZEL(Zahl)", text: "Quadratwurzel" },
  { name: "VERKETTEN", syntax: "VERKETTEN(Text1; Text2; …)", text: "Verbindet Texte (auch mit &)" },
  { name: "LÄNGE", syntax: "LÄNGE(Text)", text: "Anzahl Zeichen" },
  { name: "LINKS", syntax: "LINKS(Text; [Anzahl])", text: "Erste Zeichen" },
  { name: "RECHTS", syntax: "RECHTS(Text; [Anzahl])", text: "Letzte Zeichen" },
  { name: "TEIL", syntax: "TEIL(Text; Start; Anzahl)", text: "Zeichen aus der Mitte" },
  { name: "GROSS", syntax: "GROSS(Text)", text: "In Grossbuchstaben" },
  { name: "KLEIN", syntax: "KLEIN(Text)", text: "In Kleinbuchstaben" },
  { name: "GLÄTTEN", syntax: "GLÄTTEN(Text)", text: "Überzählige Leerzeichen entfernen" },
  { name: "HEUTE", syntax: "HEUTE()", text: "Heutiges Datum" },
  { name: "JETZT", syntax: "JETZT()", text: "Datum und Uhrzeit" },
  { name: "DATUM", syntax: "DATUM(Jahr; Monat; Tag)", text: "Datum aus Teilen" },
  { name: "JAHR", syntax: "JAHR(Datum)", text: "Jahr eines Datums" },
  { name: "MONAT", syntax: "MONAT(Datum)", text: "Monat eines Datums" },
  { name: "TAG", syntax: "TAG(Datum)", text: "Tag eines Datums" },
  {
    name: "SVERWEIS",
    syntax: "SVERWEIS(Suchwert; Bereich; Spalte; [Bereich_Verweis])",
    text: "Wert in einer Tabelle nachschlagen",
  },
  { name: "ISTLEER", syntax: "ISTLEER(Wert)", text: "WAHR bei leerer Zelle" },
  { name: "ISTZAHL", syntax: "ISTZAHL(Wert)", text: "WAHR bei einer Zahl" },
  { name: "ISTTEXT", syntax: "ISTTEXT(Wert)", text: "WAHR bei Text" },
  { name: "ISTFEHLER", syntax: "ISTFEHLER(Wert)", text: "WAHR bei einem Fehlerwert" },
  {
    name: "SUMMEWENNS",
    syntax: "SUMMEWENNS(Summenbereich; Bereich1; Kriterium1; …)",
    text: "Summe mit mehreren Bedingungen",
  },
  { name: "ZÄHLENWENNS", syntax: "ZÄHLENWENNS(Bereich1; Kriterium1; …)", text: "Zählt mit mehreren Bedingungen" },
  {
    name: "MITTELWERTWENNS",
    syntax: "MITTELWERTWENNS(Mittelwertbereich; Bereich1; Kriterium1; …)",
    text: "Durchschnitt mit mehreren Bedingungen",
  },
  { name: "MAXWENNS", syntax: "MAXWENNS(Maxbereich; Bereich1; Kriterium1; …)", text: "Grösster Wert mit Bedingungen" },
  { name: "MINWENNS", syntax: "MINWENNS(Minbereich; Bereich1; Kriterium1; …)", text: "Kleinster Wert mit Bedingungen" },
  { name: "WENNS", syntax: "WENNS(Prüfung1; Wert1; Prüfung2; Wert2; …)", text: "Erste zutreffende Bedingung" },
  { name: "WENNNV", syntax: "WENNNV(Wert; Ersatz)", text: "Ersatzwert, wenn nichts gefunden wurde" },
  {
    name: "ERSTERWERT",
    syntax: "ERSTERWERT(Ausdruck; Wert1; Ergebnis1; …; [Sonst])",
    text: "Ergebnis zum passenden Wert",
  },
  { name: "WAHL", syntax: "WAHL(Index; Wert1; Wert2; …)", text: "Wählt einen Wert aus der Liste" },
  { name: "XODER", syntax: "XODER(Wahrheitswert1; …)", text: "WAHR bei ungerader Anzahl zutreffender Werte" },
  { name: "NV", syntax: "NV()", text: "Fehlerwert „nicht vorhanden“" },
  { name: "VERGLEICH", syntax: "VERGLEICH(Suchwert; Bereich; [Vergleichstyp])", text: "Position eines Wertes" },
  { name: "INDEX", syntax: "INDEX(Bereich; Zeile; [Spalte])", text: "Wert an einer Position" },
  {
    name: "XVERWEIS",
    syntax: "XVERWEIS(Suchwert; Suchbereich; Ergebnisbereich; [Wenn_nicht_gefunden]; [Vergleichsmodus]; [Suchmodus])",
    text: "Wert nachschlagen (flexibel)",
  },
  {
    name: "WVERWEIS",
    syntax: "WVERWEIS(Suchwert; Bereich; Zeile; [Bereich_Verweis])",
    text: "Wert in einer Tabelle waagrecht nachschlagen",
  },
  { name: "ZEILE", syntax: "ZEILE([Bezug])", text: "Zeilennummer" },
  { name: "SPALTE", syntax: "SPALTE([Bezug])", text: "Spaltennummer" },
  { name: "ZEILEN", syntax: "ZEILEN(Bereich)", text: "Anzahl Zeilen eines Bereichs" },
  { name: "SPALTEN", syntax: "SPALTEN(Bereich)", text: "Anzahl Spalten eines Bereichs" },
  { name: "KGRÖSSTE", syntax: "KGRÖSSTE(Bereich; k)", text: "k-grösster Wert" },
  { name: "KKLEINSTE", syntax: "KKLEINSTE(Bereich; k)", text: "k-kleinster Wert" },
  { name: "RANG", syntax: "RANG(Zahl; Bezug; [Reihenfolge])", text: "Rang einer Zahl in einer Liste" },
  { name: "MODALWERT", syntax: "MODALWERT(Zahl1; …)", text: "Häufigster Wert" },
  { name: "STABW", syntax: "STABW(Zahl1; …)", text: "Standardabweichung (Stichprobe)" },
  { name: "STABW.N", syntax: "STABW.N(Zahl1; …)", text: "Standardabweichung (Grundgesamtheit)" },
  { name: "VARIANZ", syntax: "VARIANZ(Zahl1; …)", text: "Varianz (Stichprobe)" },
  { name: "VAR.P", syntax: "VAR.P(Zahl1; …)", text: "Varianz (Grundgesamtheit)" },
  { name: "SUMMENPRODUKT", syntax: "SUMMENPRODUKT(Bereich1; Bereich2; …)", text: "Summe der Produkte" },
  { name: "QUADRATESUMME", syntax: "QUADRATESUMME(Zahl1; …)", text: "Summe der Quadrate" },
  { name: "OBERGRENZE", syntax: "OBERGRENZE(Zahl; [Schritt])", text: "Auf ein Vielfaches aufrunden" },
  { name: "UNTERGRENZE", syntax: "UNTERGRENZE(Zahl; [Schritt])", text: "Auf ein Vielfaches abrunden" },
  { name: "VRUNDEN", syntax: "VRUNDEN(Zahl; Vielfaches)", text: "Auf ein Vielfaches runden" },
  { name: "KÜRZEN", syntax: "KÜRZEN(Zahl; [Stellen])", text: "Nachkommastellen abschneiden" },
  { name: "GERADE", syntax: "GERADE(Zahl)", text: "Auf gerade Zahl aufrunden" },
  { name: "UNGERADE", syntax: "UNGERADE(Zahl)", text: "Auf ungerade Zahl aufrunden" },
  { name: "VORZEICHEN", syntax: "VORZEICHEN(Zahl)", text: "1, 0 oder -1" },
  { name: "QUOTIENT", syntax: "QUOTIENT(Zahl; Divisor)", text: "Ganzzahliger Anteil einer Division" },
  { name: "GGT", syntax: "GGT(Zahl1; …)", text: "Grösster gemeinsamer Teiler" },
  { name: "KGV", syntax: "KGV(Zahl1; …)", text: "Kleinstes gemeinsames Vielfaches" },
  { name: "PI", syntax: "PI()", text: "Kreiszahl" },
  { name: "EXP", syntax: "EXP(Zahl)", text: "e hoch Zahl" },
  { name: "LN", syntax: "LN(Zahl)", text: "Natürlicher Logarithmus" },
  { name: "LOG", syntax: "LOG(Zahl; [Basis])", text: "Logarithmus" },
  { name: "LOG10", syntax: "LOG10(Zahl)", text: "Logarithmus zur Basis 10" },
  { name: "SIN", syntax: "SIN(Zahl)", text: "Sinus (Bogenmass)" },
  { name: "COS", syntax: "COS(Zahl)", text: "Kosinus (Bogenmass)" },
  { name: "TAN", syntax: "TAN(Zahl)", text: "Tangens (Bogenmass)" },
  { name: "BOGENMASS", syntax: "BOGENMASS(Winkel)", text: "Grad in Bogenmass" },
  { name: "GRAD", syntax: "GRAD(Winkel)", text: "Bogenmass in Grad" },
  { name: "ZUFALLSZAHL", syntax: "ZUFALLSZAHL()", text: "Zufallszahl zwischen 0 und 1" },
  { name: "ZUFALLSBEREICH", syntax: "ZUFALLSBEREICH(Untere; Obere)", text: "Ganze Zufallszahl im Bereich" },
  { name: "WECHSELN", syntax: "WECHSELN(Text; Alt; Neu; [Vorkommen])", text: "Text ersetzen" },
  { name: "ERSETZEN", syntax: "ERSETZEN(Text; Start; Anzahl; Neu)", text: "Zeichen an einer Stelle ersetzen" },
  { name: "FINDEN", syntax: "FINDEN(Suchtext; Text; [Start])", text: "Position (Gross-/Kleinschreibung beachten)" },
  { name: "SUCHEN", syntax: "SUCHEN(Suchtext; Text; [Start])", text: "Position (auch mit * und ?)" },
  {
    name: "TEXTVERKETTEN",
    syntax: "TEXTVERKETTEN(Trennzeichen; Leere_ignorieren; Text1; …)",
    text: "Texte mit Trennzeichen verbinden",
  },
  { name: "TEXT", syntax: "TEXT(Wert; Format)", text: "Zahl oder Datum als Text, z. B. „TT.MM.JJJJ“" },
  { name: "WERT", syntax: "WERT(Text)", text: "Text in eine Zahl umwandeln" },
  { name: "GROSS2", syntax: "GROSS2(Text)", text: "Wortanfänge gross" },
  { name: "WIEDERHOLEN", syntax: "WIEDERHOLEN(Text; Anzahl)", text: "Text wiederholen" },
  { name: "IDENTISCH", syntax: "IDENTISCH(Text1; Text2)", text: "Texte genau gleich?" },
  { name: "ZEICHEN", syntax: "ZEICHEN(Zahl)", text: "Zeichen zu einem Code" },
  { name: "CODE", syntax: "CODE(Text)", text: "Code des ersten Zeichens" },
  { name: "SÄUBERN", syntax: "SÄUBERN(Text)", text: "Steuerzeichen entfernen" },
  { name: "WOCHENTAG", syntax: "WOCHENTAG(Datum; [Typ])", text: "Wochentag als Zahl (Typ 2: Montag = 1)" },
  { name: "KALENDERWOCHE", syntax: "KALENDERWOCHE(Datum; [Typ])", text: "Kalenderwoche (Typ 21: nach ISO)" },
  { name: "ISOKALENDERWOCHE", syntax: "ISOKALENDERWOCHE(Datum)", text: "Kalenderwoche nach ISO" },
  { name: "TAGE", syntax: "TAGE(Enddatum; Startdatum)", text: "Tage zwischen zwei Daten" },
  { name: "EDATUM", syntax: "EDATUM(Datum; Monate)", text: "Datum Monate später oder früher" },
  { name: "MONATSENDE", syntax: "MONATSENDE(Datum; Monate)", text: "Letzter Tag des Monats" },
  {
    name: "NETTOARBEITSTAGE",
    syntax: "NETTOARBEITSTAGE(Start; Ende; [Freie_Tage])",
    text: "Arbeitstage (Mo–Fr) zwischen zwei Daten",
  },
  { name: "ARBEITSTAG", syntax: "ARBEITSTAG(Start; Tage; [Freie_Tage])", text: "Datum nach Arbeitstagen" },
  { name: "STUNDE", syntax: "STUNDE(Zeit)", text: "Stunde einer Uhrzeit" },
  { name: "MINUTE", syntax: "MINUTE(Zeit)", text: "Minute einer Uhrzeit" },
  { name: "SEKUNDE", syntax: "SEKUNDE(Zeit)", text: "Sekunde einer Uhrzeit" },
  { name: "ZEIT", syntax: "ZEIT(Stunde; Minute; Sekunde)", text: "Uhrzeit aus Teilen" },
  { name: "DATWERT", syntax: "DATWERT(Text)", text: "Text in ein Datum umwandeln" },
  { name: "ZEITWERT", syntax: "ZEITWERT(Text)", text: "Text in eine Uhrzeit umwandeln" },
  { name: "DATEDIF", syntax: "DATEDIF(Start; Ende; Einheit)", text: "Abstand in „Y“, „M“, „D“, „YM“, „MD“, „YD“" },
  { name: "ISTGERADE", syntax: "ISTGERADE(Zahl)", text: "WAHR bei gerader Zahl" },
  { name: "ISTUNGERADE", syntax: "ISTUNGERADE(Zahl)", text: "WAHR bei ungerader Zahl" },
  { name: "ISTLOG", syntax: "ISTLOG(Wert)", text: "WAHR bei einem Wahrheitswert" },
  { name: "ISTKTEXT", syntax: "ISTKTEXT(Wert)", text: "WAHR, wenn kein Text" },
  { name: "ISTNV", syntax: "ISTNV(Wert)", text: "WAHR beim Fehler „nicht vorhanden“" },
  { name: "ISTFEHL", syntax: "ISTFEHL(Wert)", text: "WAHR bei Fehlern ausser „nicht vorhanden“" },
];

export function evaluate(expr: Expr, resolver: Resolver): Value {
  const result = evaluateArg(expr, resolver);
  return isGrid(result) ? (result.length === 1 && result[0].length === 1 ? result[0][0] : fail("#VALUE!")) : result;
}

function evaluateArg(expr: Expr, resolver: Resolver): Arg {
  switch (expr.k) {
    case "num":
      return expr.v;
    case "str":
      return expr.v;
    case "bool":
      return expr.v;
    case "error":
      return fail(expr.code);
    case "ref":
      if (expr.sheet !== undefined && !resolver.hasSheet(expr.sheet)) return fail("#REF!");
      return resolver.cell(expr.sheet, expr.col, expr.row);
    case "range": {
      if (expr.sheet !== undefined && !resolver.hasSheet(expr.sheet)) return fail("#REF!");
      const { c1, r1, c2 } = expr.area;
      const r2 = Math.min(expr.area.r2, Math.max(r1, (resolver.rows?.(expr.sheet) ?? MAX_ROWS) - 1));
      if ((r2 - r1 + 1) * (c2 - c1 + 1) > 200_000) return fail("#REF!");
      const grid: Grid = [];
      for (let row = r1; row <= r2; row += 1) {
        const line: Value[] = [];
        for (let col = c1; col <= c2; col += 1) line.push(resolver.cell(expr.sheet, col, row));
        grid.push(line);
      }
      return grid;
    }
    case "unary": {
      const value = toNumber(evaluate(expr.arg, resolver));
      if (isError(value)) return value;
      return expr.op === "-" ? -value : value;
    }
    case "percent": {
      const value = toNumber(evaluate(expr.arg, resolver));
      return isError(value) ? value : value / 100;
    }
    case "binary": {
      const left = evaluate(expr.left, resolver);
      const right = evaluate(expr.right, resolver);
      if (isError(left)) return left;
      if (isError(right)) return right;
      if (expr.op === "&") return toText(left) + toText(right);
      if (["=", "<>", "<", ">", "<=", ">="].includes(expr.op)) {
        const result = compare(left, right);
        if (expr.op === "=") return result === 0;
        if (expr.op === "<>") return result !== 0;
        if (expr.op === "<") return result < 0;
        if (expr.op === ">") return result > 0;
        if (expr.op === "<=") return result <= 0;
        return result >= 0;
      }
      const a = toNumber(left);
      const b = toNumber(right);
      if (isError(a)) return a;
      if (isError(b)) return b;
      if (expr.op === "+") return a + b;
      if (expr.op === "-") return a - b;
      if (expr.op === "*") return a * b;
      if (expr.op === "/") return b === 0 ? fail("#DIV/0!") : a / b;
      const power = a ** b;
      return Number.isFinite(power) ? power : fail("#NUM!");
    }
    case "call": {
      const name = canonical(expr.name);
      // ZEILE/SPALTE/ZEILEN/SPALTEN brauchen den Bezug selbst, nicht dessen Werte.
      if (name === "ROW" || name === "COLUMN" || name === "ROWS" || name === "COLUMNS") {
        const target = expr.args[0];
        if (expr.args.length > 1) return fail("#VALUE!");
        if (!target) {
          if (!resolver.self || name === "ROWS" || name === "COLUMNS") return fail("#VALUE!");
          return (name === "ROW" ? resolver.self.row : resolver.self.col) + 1;
        }
        const area =
          target.k === "ref"
            ? { c1: target.col, r1: target.row, c2: target.col, r2: target.row }
            : target.k === "range"
              ? target.area
              : null;
        if (!area) return fail("#VALUE!");
        if (name === "ROW") return area.r1 + 1;
        if (name === "COLUMN") return area.c1 + 1;
        return name === "ROWS" ? area.r2 - area.r1 + 1 : area.c2 - area.c1 + 1;
      }
      const impl = FUNCTIONS[name];
      if (!impl) return fail("#NAME?");
      // WENN und WENNFEHLER rechnen nur den gewählten Zweig (wie Excel).
      if (name === "IF" && expr.args.length >= 2 && expr.args.length <= 3) {
        const test = truthy(evaluate(expr.args[0], resolver));
        if (isError(test)) return test;
        if (test) return evaluate(expr.args[1], resolver);
        return expr.args.length > 2 ? evaluate(expr.args[2], resolver) : false;
      }
      if (name === "IFERROR" && expr.args.length === 2) {
        const value = evaluate(expr.args[0], resolver);
        return isError(value) ? evaluate(expr.args[1], resolver) : value;
      }
      return impl(
        expr.args.map((arg) => evaluateArg(arg, resolver)),
        resolver,
      );
    }
  }
}

// ---------- Umschreiben ----------

function rewrite(source: string, mapName: (name: string) => string, excel: boolean) {
  const tokens = tokenize(source);
  return tokens
    .map((token, index) => {
      switch (token.t) {
        case "num":
          return String(token.v);
        case "str":
          return `"${token.v.replace(/"/g, '""')}"`;
        case "ref":
          return token.sheet !== undefined
            ? `${/^[A-Za-z_][\w.]*$/.test(token.sheet) ? token.sheet : `'${token.sheet.replace(/'/g, "''")}'`}!${token.v}`
            : token.v;
        case "name": {
          if (tokens[index + 1]?.t === "(") return mapName(token.v.toUpperCase());
          const upper = token.v.toUpperCase();
          if (upper === "WAHR" || upper === "TRUE") return excel ? "TRUE" : "WAHR";
          if (upper === "FALSCH" || upper === "FALSE") return excel ? "FALSE" : "FALSCH";
          return token.v;
        }
        case "err":
          return excel ? "#REF!" : "#BEZUG!";
        case "cols":
          return token.v;
        case "op":
          return token.v;
        case "sep":
          return excel ? "," : ";";
        case "(":
          return "(";
        case ")":
          return ")";
      }
    })
    .join("");
}

// Für die .xlsx-Datei: englische Namen und Komma (so speichert Excel Formeln intern).
export function toExcelFormula(source: string) {
  try {
    return rewrite(
      source,
      (name) => {
        const english = canonical(name);
        return XLFN.has(english) ? `_xlfn.${english}` : english;
      },
      true,
    );
  } catch {
    return null;
  }
}

// Aus einer .xlsx-Datei: deutsche Namen und Semikolon wie in der Oberfläche.
export function fromExcelFormula(source: string) {
  try {
    return rewrite(source, (name) => GERMAN_OF[canonical(name)] ?? name, false);
  } catch {
    return source;
  }
}

// Zellbezüge in einer Formel umschreiben (Text in Anführungszeichen bleibt unberührt). Für jeden Bezug oder
// Bereich liefert die Funktion den neuen Bezug oder null (dann „#BEZUG!“, wie in Excel nach dem Löschen).
export type RefInfo = { sheet?: string; col: number; row: number; absCol: boolean; absRow: boolean };
export type RefRange = { start: RefInfo; end: RefInfo | null };

const REF_PATTERN = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,6})(?![\w(!])/;
const quoteSheet = (sheet: string) =>
  /^[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*$/.test(sheet) && !/^[A-Za-z]{1,3}\d+$/.test(sheet)
    ? sheet
    : `'${sheet.replace(/'/g, "''")}'`;
const refText = (ref: RefInfo) =>
  `${ref.absCol ? "$" : ""}${columnName(ref.col)}${ref.absRow ? "$" : ""}${ref.row + 1}`;

export function rewriteReferences(source: string, fn: (range: RefRange) => RefRange | null) {
  try {
    tokenize(source);
  } catch {
    return source;
  }
  const readRef = (at: number, sheet: string | undefined): [RefInfo, number] | null => {
    const match = REF_PATTERN.exec(source.slice(at));
    if (!match) return null;
    const col = columnIndex(match[2]);
    const row = Number(match[4]) - 1;
    if (col >= MAX_COLS || row >= MAX_ROWS) return null;
    return [{ sheet, col, row, absCol: match[1] === "$", absRow: match[3] === "$" }, at + match[0].length];
  };
  const readSheet = (at: number): [string, number] | null => {
    if (source[at] === "'") {
      const close = source.indexOf("'!", at + 1);
      return close < 0 ? null : [source.slice(at + 1, close).replace(/''/g, "'"), close + 2];
    }
    const word = /^[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*!/.exec(source.slice(at));
    return word ? [word[0].slice(0, -1), at + word[0].length] : null;
  };
  let out = "";
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === '"') {
      let stop = i + 1;
      while (stop < source.length) {
        if (source[stop] === '"' && source[stop + 1] === '"') stop += 2;
        else if (source[stop] === '"') break;
        else stop += 1;
      }
      out += source.slice(i, stop + 1);
      i = stop + 1;
      continue;
    }
    const before = source[i - 1] ?? "";
    if (!NAME_CHAR.test(before) && before !== "$" && before !== "'") {
      const sheetPart = readSheet(i);
      const startAt = sheetPart ? sheetPart[1] : i;
      const first = readRef(startAt, sheetPart?.[0]);
      if (first) {
        let [start, next] = first;
        let end: RefInfo | null = null;
        if (source[next] === ":") {
          const endSheet = readSheet(next + 1);
          const second = readRef(endSheet ? endSheet[1] : next + 1, start.sheet);
          if (second) [end, next] = second;
        }
        const result = fn({ start, end });
        if (!result) out += "#BEZUG!";
        else {
          start = result.start;
          out += `${start.sheet !== undefined ? `${quoteSheet(start.sheet)}!` : ""}${refText(start)}${result.end ? `:${refText(result.end)}` : ""}`;
        }
        i = next;
        continue;
      }
    }
    if (NAME_CHAR.test(char)) {
      let word = "";
      while (i < source.length && NAME_CHAR.test(source[i])) word += source[i++];
      out += word;
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

// Bezüge beim Kopieren/Einfügen oder Ausfüllen verschieben (A1 → B2), absolute Teile ($A$1) bleiben.
export function shiftFormula(source: string, dCol: number, dRow: number) {
  const move = (ref: RefInfo): RefInfo | null => {
    const col = ref.absCol ? ref.col : ref.col + dCol;
    const row = ref.absRow ? ref.row : ref.row + dRow;
    return col < 0 || row < 0 || col >= MAX_COLS || row >= MAX_ROWS ? null : { ...ref, col, row };
  };
  return rewriteReferences(source, ({ start, end }) => {
    const a = move(start);
    const b = end ? move(end) : null;
    return !a || (end && !b) ? null : { start: a, end: b };
  });
}

// Zeilen oder Spalten einfügen (count > 0) bzw. löschen (count < 0) ab „index“: Bezüge auf das betroffene Blatt
// wandern mit; Bezüge auf gelöschte Zellen werden „#BEZUG!“, Bereiche werden kleiner.
export function adjustForInsertDelete(
  source: string,
  axis: "row" | "col",
  index: number,
  count: number,
  affects: (sheet: string | undefined) => boolean,
) {
  const key = axis === "row" ? "row" : "col";
  return rewriteReferences(source, ({ start, end }) => {
    if (!affects(start.sheet)) return { start, end };
    if (count > 0) {
      const move = (ref: RefInfo) => (ref[key] >= index ? { ...ref, [key]: ref[key] + count } : ref);
      return { start: move(start), end: end ? move(end) : null };
    }
    const removed = -count;
    const last = index + removed - 1;
    const after = (ref: RefInfo) => (ref[key] > last ? { ...ref, [key]: ref[key] - removed } : ref);
    if (!end) return start[key] >= index && start[key] <= last ? null : { start: after(start), end: null };
    let a = start[key];
    let b = end[key];
    if (a >= index && b <= last) return null;
    if (a >= index && a <= last) a = index;
    else if (a > last) a -= removed;
    if (b >= index && b <= last) b = index - 1;
    else if (b > last) b -= removed;
    if (b < a) return null;
    return { start: { ...start, [key]: a }, end: { ...end, [key]: b } };
  });
}

// Blatt umbenennen: Bezüge aus anderen Blättern zeigen danach auf den neuen Namen.
export function renameSheetReferences(source: string, from: string, to: string) {
  const lower = from.toLocaleLowerCase("de-CH");
  return rewriteReferences(source, ({ start, end }) =>
    start.sheet !== undefined && start.sheet.toLocaleLowerCase("de-CH") === lower
      ? { start: { ...start, sheet: to }, end }
      : { start, end },
  );
}
