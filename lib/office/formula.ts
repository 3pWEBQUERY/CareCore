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

function numeric(fn: (...values: number[]) => number | CellError, arity: [number, number]): Impl {
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
};
const ENGLISH_ALIASES: Record<string, string> = { CONCATENATE: "CONCAT", "_XLFN.CONCAT": "CONCAT" };
const canonical = (name: string) => GERMAN[name] ?? ENGLISH_ALIASES[name] ?? name;
const GERMAN_OF = Object.fromEntries(
  Object.entries(GERMAN)
    .filter(([german]) => german !== "TEXTKETTE")
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
        return english === "CONCAT" ? "_xlfn.CONCAT" : english;
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
