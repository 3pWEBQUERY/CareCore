"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal, flushSync } from "react-dom";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsMerge,
  Columns,
  DownloadSimple,
  Eraser,
  Function as FunctionIcon,
  PaintBucket,
  Plus,
  Rows,
  Sigma,
  Snowflake,
  SortAscending,
  SortDescending,
  SquareHalf,
  TextAUnderline,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  ArrowUDownLeft as WrapText,
} from "@phosphor-icons/react";
import {
  ERROR_HINTS,
  FUNCTION_HELP,
  areaName,
  cellKey,
  columnName,
  formulaProblem,
  isError,
  type Area,
  type Value,
} from "@/lib/office/formula";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  NUMBER_FORMATS,
  decimalsOf,
  evaluateWorkbook,
  formatValue,
  newSheet,
  usedRange,
  type CellStyle,
  type NumberFormat,
  type Sheet,
  type SheetCell,
  type SheetModel,
} from "@/lib/office/model";
import {
  areaOf,
  clearArea,
  duplicateSheet,
  inArea,
  insertDelete,
  mergesOf,
  overlaps,
  parseClipboard,
  renameSheet,
  replaceSheet,
  setValue,
  setValues,
  shiftedCell,
  sortArea,
  styleArea,
  toDelimited,
  type Pos,
  type Range,
} from "@/lib/office/sheet-ops";
import type { EditorProps } from "./editor-props";
import { ColorPicker, MenuList, ToolButton, ToolGroup, ToolPopover, ToolSeparator, type MenuItem } from "./office-ui";

const HEADER_H = 26;
const ROWHEAD_W = 48;
const OVERSCAN = 12;
const HISTORY = 100;

type Editing = { pos: Pos; value: string; mode: "enter" | "edit"; source: "cell" | "bar" };
type Clip = { text: string; area: Area; sheet: number; cells: (SheetCell | undefined)[][]; cut: boolean };
type Menu = { x: number; y: number; kind: "cell" | "tab"; sheet?: number } | null;
type Drag = { kind: "select" | "rows" | "cols" | "fill" | "point"; start: Pos } | null;

const sameArea = (a: Area, b: Area) => a.c1 === b.c1 && a.r1 === b.r1 && a.c2 === b.c2 && a.r2 === b.r2;
const OPERATOR_END = /[=(;,+\-*/^&<>:]$/;

function lowerBound(tops: number[], y: number) {
  let lo = 0;
  let hi = tops.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tops[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Aktuelle Funktion (für die Hilfe zur Schreibweise) und angefangener Funktionsname (für Vorschläge).
function formulaContext(value: string) {
  if (!value.startsWith("=")) return { typing: null as string | null, inside: null as string | null };
  const typing = /(?:^=|[=(;,+\-*/^&<>:\s])([A-Za-zÄÖÜäöü][A-Za-zÄÖÜäöü0-9.]*)$/.exec(value)?.[1] ?? null;
  const stack: string[] = [];
  let quoted = false;
  let word = "";
  for (const char of value.slice(1)) {
    if (char === '"') quoted = !quoted;
    if (quoted) continue;
    if (/[A-Za-zÄÖÜäöü0-9.]/.test(char)) word += char;
    else {
      if (char === "(") stack.push(word.toUpperCase());
      else if (char === ")") stack.pop();
      word = "";
    }
  }
  return { typing, inside: stack[stack.length - 1] ?? null };
}

export default function SheetEditor({ model: initial, onChange, readOnly, title }: EditorProps<SheetModel>) {
  const [model, setModel] = useState(initial);
  const modelRef = useRef(initial);
  const [active, setActive] = useState(0);
  const [range, setRange] = useState<Range>({ anchor: { col: 0, row: 0 }, focus: { col: 0, row: 0 } });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [formulaError, setFormulaError] = useState("");
  const [history, setHistory] = useState<{ undo: SheetModel[]; redo: SheetModel[] }>({ undo: [], redo: [] });
  const [scroll, setScroll] = useState({ top: 0, left: 0, height: 600 });
  const [menu, setMenu] = useState<Menu>(null);
  const [renaming, setRenaming] = useState<{ index: number; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [resize, setResize] = useState<{ kind: "col" | "row"; index: number; size: number } | null>(null);
  const [fillTarget, setFillTarget] = useState<Area | null>(null);
  const [notice, setNotice] = useState("");
  const [printing, setPrinting] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag>(null);
  const clip = useRef<Clip | null>(null);
  const [point, setPoint] = useState<{ start: number; result: string } | null>(null);
  const emit = useRef(onChange);
  useEffect(() => {
    emit.current = onChange;
  }, [onChange]);

  const sheet = model.sheets[active] ?? model.sheets[0];
  const area = areaOf(range);
  const merges = useMemo(() => mergesOf(sheet), [sheet]);
  const evaluator = useMemo(() => evaluateWorkbook(model), [model]);
  const valueAt = useCallback(
    (col: number, row: number) => evaluator.value(active, cellKey(col, row)),
    [evaluator, active],
  );

  const commit = useCallback((next: SheetModel) => {
    const previous = modelRef.current;
    modelRef.current = next;
    setModel(next);
    setHistory((current) => ({ undo: [...current.undo.slice(-HISTORY + 1), previous], redo: [] }));
    emit.current(next);
  }, []);
  const commitSheet = useCallback(
    (change: (sheet: Sheet) => Sheet) => {
      const current = modelRef.current;
      commit(replaceSheet(current, active, change(current.sheets[active])));
    },
    [active, commit],
  );
  function undo() {
    setHistory((current) => {
      const previous = current.undo[current.undo.length - 1];
      if (!previous) return current;
      const now = modelRef.current;
      modelRef.current = previous;
      setModel(previous);
      emit.current(previous);
      if (active >= previous.sheets.length) setActive(previous.sheets.length - 1);
      return { undo: current.undo.slice(0, -1), redo: [...current.redo, now] };
    });
  }
  function redo() {
    setHistory((current) => {
      const next = current.redo[current.redo.length - 1];
      if (!next) return current;
      const now = modelRef.current;
      modelRef.current = next;
      setModel(next);
      emit.current(next);
      if (active >= next.sheets.length) setActive(next.sheets.length - 1);
      return { undo: [...current.undo, now], redo: current.redo.slice(0, -1) };
    });
  }

  // ---------- Masse ----------
  const colWidths = useMemo(
    () =>
      Array.from({ length: sheet.colCount }, (_, col) =>
        resize?.kind === "col" && resize.index === col ? resize.size : (sheet.cols[String(col)] ?? DEFAULT_COL_WIDTH),
      ),
    [sheet, resize],
  );
  const rowHeights = useMemo(
    () =>
      Array.from({ length: sheet.rowCount }, (_, row) =>
        resize?.kind === "row" && resize.index === row ? resize.size : (sheet.rows[String(row)] ?? DEFAULT_ROW_HEIGHT),
      ),
    [sheet, resize],
  );
  const colLefts = useMemo(() => {
    const out = [0];
    colWidths.forEach((width) => out.push(out[out.length - 1] + width));
    return out;
  }, [colWidths]);
  const rowTops = useMemo(() => {
    const out = [0];
    rowHeights.forEach((height) => out.push(out[out.length - 1] + height));
    return out;
  }, [rowHeights]);
  const freezeRows = Math.min(sheet.freeze.rows, sheet.rowCount);
  const freezeCols = Math.min(sheet.freeze.cols, sheet.colCount);
  const frozenHeight = rowTops[freezeRows];
  const frozenWidth = colLefts[freezeCols];

  // Sichtbare Zeilen (nur diese werden gezeichnet – auch grosse Tabellen bleiben flüssig).
  let first = Math.max(freezeRows, lowerBound(rowTops, scroll.top + frozenHeight) - OVERSCAN);
  const last = Math.min(sheet.rowCount - 1, lowerBound(rowTops, scroll.top + scroll.height) + OVERSCAN);
  for (const merge of merges) if (merge.r1 < first && merge.r2 >= first && merge.r1 >= freezeRows) first = merge.r1;

  const mergeAt = useMemo(() => {
    const origin = new Map<string, Area>();
    const covered = new Set<string>();
    for (const merge of merges) {
      origin.set(cellKey(merge.c1, merge.r1), merge);
      for (let row = merge.r1; row <= merge.r2; row += 1)
        for (let col = merge.c1; col <= merge.c2; col += 1)
          if (row !== merge.r1 || col !== merge.c1) covered.add(cellKey(col, row));
    }
    return { origin, covered };
  }, [merges]);

  // ---------- Auswahl ----------
  const select = useCallback(
    (anchor: Pos, focus: Pos = anchor) => {
      const clamp = (pos: Pos) => ({
        col: Math.max(0, Math.min(sheet.colCount - 1, pos.col)),
        row: Math.max(0, Math.min(sheet.rowCount - 1, pos.row)),
      });
      setRange({ anchor: clamp(anchor), focus: clamp(focus) });
    },
    [sheet.colCount, sheet.rowCount],
  );

  // Aktive Zelle sichtbar halten.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const { col, row } = range.focus;
    if (row >= freezeRows) {
      const top = rowTops[row] - frozenHeight;
      const bottom = rowTops[row + 1] - frozenHeight;
      const view = grid.clientHeight - HEADER_H - frozenHeight;
      if (top < grid.scrollTop) grid.scrollTop = top;
      else if (bottom > grid.scrollTop + view) grid.scrollTop = bottom - view;
    }
    if (col >= freezeCols) {
      const left = colLefts[col] - frozenWidth;
      const right = colLefts[col + 1] - frozenWidth;
      const view = grid.clientWidth - ROWHEAD_W - frozenWidth;
      if (left < grid.scrollLeft) grid.scrollLeft = left;
      else if (right > grid.scrollLeft + view) grid.scrollLeft = right - view;
    }
  }, [range.focus, rowTops, colLefts, freezeRows, freezeCols, frozenHeight, frozenWidth]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => setScroll({ top: grid.scrollTop, left: grid.scrollLeft, height: grid.clientHeight });
    update();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    grid.addEventListener("scroll", onScroll);
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    return () => {
      grid.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [active]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(id);
  }, [notice]);

  // Drucken: ganze Tabelle (nicht nur der sichtbare Ausschnitt).
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const focusGrid = () => gridRef.current?.focus({ preventScroll: true });
  const rawAt = (pos: Pos) => sheet.cells[cellKey(pos.col, pos.row)]?.v ?? "";
  const styleAt = (pos: Pos) => sheet.cells[cellKey(pos.col, pos.row)]?.s;

  // ---------- Bearbeiten ----------
  function startEdit(mode: Editing["mode"], value?: string, source: Editing["source"] = "cell") {
    if (readOnly) return;
    const pos = range.focus;
    const origin = [...mergeAt.origin.values()].find((merge) => inArea(merge, pos.col, pos.row));
    const target = origin ? { col: origin.c1, row: origin.r1 } : pos;
    setEditing({ pos: target, value: value ?? rawAt(target), mode, source });
    setFormulaError("");
    setSuggestIndex(0);
    setPoint(null);
  }

  function commitEdit(move?: { dc: number; dr: number }) {
    if (!editing) return true;
    const raw = editing.value;
    if (raw.startsWith("=") && raw.length > 1) {
      const problem = formulaProblem(raw.slice(1));
      if (problem) {
        setFormulaError(`Formel unvollständig: ${problem}.`);
        return false;
      }
    }
    if (raw !== rawAt(editing.pos)) commitSheet((current) => setValue(current, editing.pos, raw));
    setEditing(null);
    setFormulaError("");
    setPoint(null);
    if (move) {
      const next = { col: editing.pos.col + move.dc, row: editing.pos.row + move.dr };
      select(next);
    } else select(editing.pos);
    focusGrid();
    return true;
  }

  function cancelEdit() {
    setEditing(null);
    setFormulaError("");
    setPoint(null);
    focusGrid();
  }

  const context = editing ? formulaContext(editing.value) : { typing: null, inside: null };
  const suggestions =
    editing && context.typing
      ? FUNCTION_HELP.filter((item) => item.name.startsWith(context.typing!.toUpperCase())).slice(0, 8)
      : [];
  const signature = context.inside ? FUNCTION_HELP.find((item) => item.name === context.inside) : null;

  function acceptSuggestion(name: string) {
    if (!editing || !context.typing) return;
    const value = `${editing.value.slice(0, editing.value.length - context.typing.length)}${name}(`;
    setEditing({ ...editing, value, mode: "edit" });
    setSuggestIndex(0);
    requestAnimationFrame(() =>
      (editing.source === "bar"
        ? barRef.current
        : gridRef.current?.querySelector<HTMLInputElement>(".sheet-cell-editor")
      )?.focus(),
    );
  }

  // Beim Schreiben einer Formel: Klick auf eine Zelle fügt ihren Bezug ein, Ziehen einen Bereich.
  function pointAt(pos: Pos, anchor?: Pos) {
    if (!editing) return;
    const text = anchor ? areaName(areaOf({ anchor, focus: pos })) : cellKey(pos.col, pos.row);
    const sheetPrefix = "";
    let start = editing.value.length;
    if (point && editing.value === point.result) start = point.start;
    const value = `${editing.value.slice(0, start)}${sheetPrefix}${text}`;
    setPoint({ start, result: value });
    setEditing({ ...editing, value });
  }
  const pointMode = Boolean(
    editing &&
    editing.value.startsWith("=") &&
    (OPERATOR_END.test(editing.value) || (point && editing.value === point.result)),
  );

  // ---------- Werkzeuge ----------
  const activeStyle = styleAt(range.focus) ?? {};
  function applyStyle(change: (style: CellStyle) => CellStyle) {
    if (readOnly) return;
    commitSheet((current) => styleArea(current, area, change));
  }
  const toggle = (flag: "b" | "i" | "u" | "s" | "wrap" | "border") => {
    const on = !activeStyle[flag];
    applyStyle((style) => ({ ...style, [flag]: on }));
  };
  function setFormat(fmt: NumberFormat) {
    applyStyle((style) => ({ ...style, fmt: fmt === "general" ? undefined : fmt, dec: undefined }));
  }
  function changeDecimals(delta: number) {
    applyStyle((style) => {
      const fmt = style.fmt && style.fmt !== "general" ? style.fmt : "number";
      return { ...style, fmt, dec: Math.max(0, Math.min(10, decimalsOf({ ...style, fmt }) + delta)) };
    });
  }
  function toggleMerge() {
    if (readOnly) return;
    const touching = merges.filter((merge) => overlaps(merge, area));
    if (touching.length) {
      commitSheet((current) => ({
        ...current,
        merges: mergesOf(current)
          .filter((merge) => !overlaps(merge, area))
          .map(areaName),
      }));
      return;
    }
    if (area.c1 === area.c2 && area.r1 === area.r2) return;
    const lost = Object.keys(sheet.cells).filter((key) => {
      const col = key.match(/^[A-Z]+/)?.[0];
      const row = Number(key.match(/\d+$/)?.[0]) - 1;
      if (!col) return false;
      const index = col.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
      return inArea(area, index, row) && !(index === area.c1 && row === area.r1) && sheet.cells[key].v !== "";
    });
    commitSheet((current) => {
      let next = current;
      if (lost.length) {
        const cells = { ...next.cells };
        for (const key of lost) cells[key] = { ...cells[key], v: "" };
        next = { ...next, cells };
      }
      return { ...next, merges: [...next.merges, areaName(area)] };
    });
    if (lost.length) setNotice("Verbunden – nur der Wert oben links bleibt erhalten");
  }
  function autoSum() {
    if (readOnly) return;
    const pos = range.focus;
    let top = pos.row - 1;
    while (top >= 0 && typeof valueAt(pos.col, top) === "number") top -= 1;
    const formula =
      top < pos.row - 1 ? `=SUMME(${columnName(pos.col)}${top + 2}:${columnName(pos.col)}${pos.row})` : "=SUMME()";
    startEdit("edit", formula);
  }
  function setFreeze(rows: number, cols: number) {
    commitSheet((current) => ({ ...current, freeze: { rows, cols } }));
  }
  function insert(axis: "row" | "col", before: boolean) {
    if (readOnly) return;
    const index = axis === "row" ? (before ? area.r1 : area.r2 + 1) : before ? area.c1 : area.c2 + 1;
    const count = axis === "row" ? area.r2 - area.r1 + 1 : area.c2 - area.c1 + 1;
    commit(insertDelete(modelRef.current, active, axis, index, count));
  }
  function remove(axis: "row" | "col") {
    if (readOnly) return;
    const index = axis === "row" ? area.r1 : area.c1;
    const count = axis === "row" ? area.r2 - area.r1 + 1 : area.c2 - area.c1 + 1;
    if ((axis === "row" ? sheet.rowCount : sheet.colCount) - count < 1) return;
    commit(insertDelete(modelRef.current, active, axis, index, -count));
    select({ col: Math.min(area.c1, sheet.colCount - 1), row: Math.min(area.r1, sheet.rowCount - 1) });
  }
  function sort(direction: 1 | -1) {
    if (readOnly) return;
    let region = area;
    if (area.r1 === area.r2) {
      const used = usedRange(sheet);
      const startRow = Math.max(freezeRows, 0);
      region = { c1: 0, r1: startRow, c2: Math.max(0, used.cols - 1), r2: Math.max(startRow, used.rows - 1) };
      if (region.r2 <= region.r1) return;
    }
    commitSheet((current) => sortArea(current, region, range.focus.col, direction, (col, row) => valueAt(col, row)));
    setNotice(direction === 1 ? "Aufsteigend sortiert" : "Absteigend sortiert");
  }
  function clear(what: "content" | "all") {
    if (readOnly) return;
    commitSheet((current) => clearArea(current, area, what));
  }
  function autoFit(col: number) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 40;
    for (let row = 0; row < sheet.rowCount; row += 1) {
      const cell = sheet.cells[cellKey(col, row)];
      if (!cell) continue;
      ctx.font = `${cell.s?.b ? "700" : "400"} ${cell.s?.size ? (cell.s.size * 4) / 3 : 14}px Calibri, Carlito, Arial, sans-serif`;
      width = Math.max(width, ctx.measureText(formatValue(valueAt(col, row), cell.s)).width + 16);
    }
    commitSheet((current) => ({
      ...current,
      cols: { ...current.cols, [String(col)]: Math.min(600, Math.ceil(width)) },
    }));
  }

  // ---------- Zwischenablage ----------
  function selectionText(source: Area) {
    const rows: string[][] = [];
    for (let row = source.r1; row <= source.r2; row += 1) {
      const line: string[] = [];
      for (let col = source.c1; col <= source.c2; col += 1)
        line.push(formatValue(valueAt(col, row), styleAt({ col, row })));
      rows.push(line);
    }
    return toDelimited(rows, "\t");
  }
  function copy(cut: boolean, data?: DataTransfer | null) {
    const text = selectionText(area);
    const cells: (SheetCell | undefined)[][] = [];
    for (let row = area.r1; row <= area.r2; row += 1) {
      const line: (SheetCell | undefined)[] = [];
      for (let col = area.c1; col <= area.c2; col += 1) line.push(sheet.cells[cellKey(col, row)]);
      cells.push(line);
    }
    clip.current = { text, area, sheet: active, cells, cut };
    if (data) data.setData("text/plain", text);
    else void navigator.clipboard?.writeText(text).catch(() => undefined);
    setNotice(cut ? "Ausgeschnitten – an der Zielzelle einfügen" : "Kopiert");
  }
  function paste(text: string) {
    if (readOnly) return;
    const target = { col: area.c1, row: area.r1 };
    const internal = clip.current && clip.current.text === text ? clip.current : null;
    if (internal) {
      const height = internal.cells.length;
      const width = internal.cells[0]?.length ?? 0;
      const dRow = target.row - internal.area.r1;
      const dCol = target.col - internal.area.c1;
      // Ist die Auswahl ein Vielfaches des Kopierten, wird sie damit gefüllt (wie in Excel).
      const tilesY = !internal.cut && (area.r2 - area.r1 + 1) % height === 0 ? (area.r2 - area.r1 + 1) / height : 1;
      const tilesX = !internal.cut && (area.c2 - area.c1 + 1) % width === 0 ? (area.c2 - area.c1 + 1) / width : 1;
      let next = modelRef.current;
      if (internal.cut) {
        const source = next.sheets[internal.sheet];
        next = replaceSheet(next, internal.sheet, clearArea(source, internal.area, "all"));
      }
      const entries: { pos: Pos; cell: SheetCell | null }[] = [];
      for (let ty = 0; ty < tilesY; ty += 1)
        for (let tx = 0; tx < tilesX; tx += 1)
          internal.cells.forEach((line, r) =>
            line.forEach((cell, c) => {
              const pos = { col: target.col + tx * width + c, row: target.row + ty * height + r };
              entries.push({
                pos,
                cell: internal.cut ? (cell ?? null) : shiftedCell(cell, dCol + tx * width, dRow + ty * height),
              });
            }),
          );
      next = replaceSheet(next, active, setValues(next.sheets[active], entries));
      commit(next);
      if (internal.cut) clip.current = null;
      select(target, { col: target.col + width * tilesX - 1, row: target.row + height * tilesY - 1 });
      return;
    }
    const rows = parseClipboard(text);
    const entries: { pos: Pos; cell: SheetCell | null }[] = [];
    rows.forEach((line, r) =>
      line.forEach((value, c) => {
        const pos = { col: target.col + c, row: target.row + r };
        const current = sheet.cells[cellKey(pos.col, pos.row)];
        entries.push({ pos, cell: { v: value, ...(current?.s ? { s: current.s } : {}) } });
      }),
    );
    commitSheet((current) => setValues(current, entries));
    select(target, {
      col: target.col + Math.max(...rows.map((line) => line.length)) - 1,
      row: target.row + rows.length - 1,
    });
  }

  // ---------- Ausfüllen ----------
  function fill(source: Area, target: Area) {
    if (sameArea(source, target)) return;
    const entries: { pos: Pos; cell: SheetCell | null }[] = [];
    const vertical = target.r1 < source.r1 || target.r2 > source.r2;
    const lines = vertical ? [source.c1, source.c2] : [source.r1, source.r2];
    for (let line = lines[0]; line <= lines[1]; line += 1) {
      const seeds: Pos[] = [];
      if (vertical) for (let row = source.r1; row <= source.r2; row += 1) seeds.push({ col: line, row });
      else for (let col = source.c1; col <= source.c2; col += 1) seeds.push({ col, row: line });
      const numbers = seeds.map((pos) => {
        const raw = rawAt(pos);
        const value = valueAt(pos.col, pos.row);
        return !raw.startsWith("=") && typeof value === "number" ? value : null;
      });
      const numeric = numbers.every((value) => value !== null);
      const step =
        numeric && seeds.length >= 2
          ? (numbers[numbers.length - 1]! - numbers[0]!) / (seeds.length - 1)
          : numeric && seeds.length === 1 && ["date", "datetime"].includes(styleAt(seeds[0])?.fmt ?? "")
            ? 1
            : null;
      const span = seeds.length;
      const from = vertical ? target.r1 : target.c1;
      const to = vertical ? target.r2 : target.c2;
      const sourceStart = vertical ? source.r1 : source.c1;
      const sourceEnd = vertical ? source.r2 : source.c2;
      for (let index = from; index <= to; index += 1) {
        if (index >= sourceStart && index <= sourceEnd) continue;
        const offset = index - sourceStart;
        const seed = seeds[((offset % span) + span) % span];
        const pos = vertical ? { col: line, row: index } : { col: index, row: line };
        const cell = sheet.cells[cellKey(seed.col, seed.row)];
        if (step !== null) {
          const value = numbers[0]! + step * offset;
          entries.push({ pos, cell: { v: String(Number(value.toPrecision(15))), ...(cell?.s ? { s: cell.s } : {}) } });
        } else entries.push({ pos, cell: shiftedCell(cell, pos.col - seed.col, pos.row - seed.row) });
      }
    }
    commitSheet((current) => setValues(current, entries));
    select({ col: target.c1, row: target.r1 }, { col: target.c2, row: target.r2 });
  }
  function fillAreaFor(pos: Pos): Area {
    const down = pos.row - area.r2;
    const up = area.r1 - pos.row;
    const right = pos.col - area.c2;
    const left = area.c1 - pos.col;
    const vertical = Math.max(down, up) >= Math.max(right, left);
    if (vertical && down > 0) return { ...area, r2: pos.row };
    if (vertical && up > 0) return { ...area, r1: pos.row };
    if (!vertical && right > 0) return { ...area, c2: pos.col };
    if (!vertical && left > 0) return { ...area, c1: pos.col };
    return area;
  }

  // ---------- Maus ----------
  function beginDrag(value: Drag) {
    drag.current = value;
  }
  useEffect(() => {
    const up = () => {
      const current = drag.current;
      drag.current = null;
      if (current?.kind === "fill") {
        setFillTarget((target) => {
          if (target) queueMicrotask(() => fill(area, target));
          return null;
        });
      }
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  });

  function onCellMouseDown(event: React.MouseEvent, pos: Pos) {
    if (event.button !== 0) return;
    if (editing && pointMode) {
      event.preventDefault();
      drag.current = { kind: "point", start: pos };
      pointAt(pos);
      return;
    }
    if (editing && !commitEdit()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    focusGrid();
    if (event.shiftKey) select(range.anchor, pos);
    else select(pos);
    drag.current = { kind: "select", start: pos };
  }
  function onCellMouseEnter(pos: Pos) {
    const current = drag.current;
    if (!current) return;
    if (current.kind === "select") select(range.anchor, pos);
    else if (current.kind === "point") pointAt(pos, current.start);
    else if (current.kind === "fill") setFillTarget(fillAreaFor(pos));
    else if (current.kind === "rows")
      select({ col: 0, row: current.start.row }, { col: sheet.colCount - 1, row: pos.row });
    else if (current.kind === "cols")
      select({ col: current.start.col, row: 0 }, { col: pos.col, row: sheet.rowCount - 1 });
  }
  function startResize(event: React.MouseEvent, kind: "col" | "row", index: number) {
    event.preventDefault();
    event.stopPropagation();
    const start = kind === "col" ? event.clientX : event.clientY;
    const initialSize = kind === "col" ? colWidths[index] : rowHeights[index];
    let size = initialSize;
    const move = (moveEvent: MouseEvent) => {
      size = Math.max(
        kind === "col" ? 24 : 16,
        Math.min(800, initialSize + (kind === "col" ? moveEvent.clientX : moveEvent.clientY) - start),
      );
      setResize({ kind, index, size });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setResize(null);
      if (size !== initialSize && !readOnly)
        commitSheet((current) =>
          kind === "col"
            ? { ...current, cols: { ...current.cols, [String(index)]: Math.round(size) } }
            : { ...current, rows: { ...current.rows, [String(index)]: Math.round(size) } },
        );
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // ---------- Tastatur ----------
  function move(dc: number, dr: number, extend: boolean, jump: boolean) {
    const from = range.focus;
    let col = from.col + dc;
    let row = from.row + dr;
    if (jump) {
      // Ctrl+Pfeil: bis zum Rand des ausgefüllten Bereichs (wie Excel).
      const filled = (c: number, r: number) => rawAt({ col: c, row: r }) !== "";
      col = from.col;
      row = from.row;
      const startFilled = filled(col, row) && filled(col + dc, row + dr);
      while (col + dc >= 0 && col + dc < sheet.colCount && row + dr >= 0 && row + dr < sheet.rowCount) {
        col += dc;
        row += dr;
        if (startFilled ? !filled(col + dc, row + dr) : filled(col, row)) break;
      }
    }
    // Über verbundene Zellen hinwegspringen.
    const merge = merges.find((item) => inArea(item, col, row) && !inArea(item, from.col, from.row));
    if (merge && !extend) {
      if (dc > 0) col = merge.c1;
      if (dr > 0) row = merge.r1;
      if (dc < 0) col = merge.c1;
      if (dr < 0) row = merge.r1;
    }
    if (extend) select(range.anchor, { col, row });
    else select({ col, row });
  }

  function onGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (editing || event.target !== gridRef.current) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key;
    if (mod && key.toLowerCase() === "z") {
      event.preventDefault();
      return event.shiftKey ? redo() : undo();
    }
    if (mod && key.toLowerCase() === "y") {
      event.preventDefault();
      return redo();
    }
    if (mod && key.toLowerCase() === "a") {
      event.preventDefault();
      return select({ col: 0, row: 0 }, { col: sheet.colCount - 1, row: sheet.rowCount - 1 });
    }
    if (mod && ["b", "i", "u"].includes(key.toLowerCase())) {
      event.preventDefault();
      return toggle(key.toLowerCase() as "b" | "i" | "u");
    }
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (arrows[key]) {
      event.preventDefault();
      return move(arrows[key][0], arrows[key][1], event.shiftKey, mod);
    }
    if (key === "Enter") {
      event.preventDefault();
      return move(0, event.shiftKey ? -1 : 1, false, false);
    }
    if (key === "Tab") {
      event.preventDefault();
      return move(event.shiftKey ? -1 : 1, 0, false, false);
    }
    if (key === "Home") {
      event.preventDefault();
      return mod ? select({ col: 0, row: 0 }) : select({ col: 0, row: range.focus.row });
    }
    if (key === "End" && mod) {
      event.preventDefault();
      const used = usedRange(sheet);
      return select({ col: Math.max(0, used.cols - 1), row: Math.max(0, used.rows - 1) });
    }
    if (key === "PageDown" || key === "PageUp") {
      event.preventDefault();
      return move(0, key === "PageDown" ? 20 : -20, event.shiftKey, false);
    }
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault();
      return clear("content");
    }
    if (key === "F2") {
      event.preventDefault();
      return startEdit("edit");
    }
    if (!mod && !event.altKey && key.length === 1) {
      event.preventDefault();
      startEdit("enter", key);
    }
  }

  function onEditorKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!editing) return;
    if (suggestions.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setSuggestIndex(
        (index) => (index + (event.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length,
      );
      return;
    }
    if (suggestions.length && event.key === "Tab") {
      event.preventDefault();
      acceptSuggestion(suggestions[Math.min(suggestIndex, suggestions.length - 1)].name);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit({ dc: 0, dr: event.shiftKey ? -1 : 1 });
    } else if (event.key === "Tab") {
      event.preventDefault();
      commitEdit({ dc: event.shiftKey ? -1 : 1, dr: 0 });
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    } else if (
      editing.mode === "enter" &&
      event.key.startsWith("Arrow") &&
      !(editing.value.startsWith("=") && OPERATOR_END.test(editing.value))
    ) {
      event.preventDefault();
      const delta: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      commitEdit({ dc: delta[event.key][0], dr: delta[event.key][1] });
    }
  }

  // ---------- Blätter ----------
  function addSheet() {
    if (readOnly) return;
    const names = new Set(model.sheets.map((item) => item.name.toLocaleLowerCase("de-CH")));
    let index = model.sheets.length + 1;
    while (names.has(`tabelle${index}`)) index += 1;
    commit({ ...modelRef.current, sheets: [...modelRef.current.sheets, newSheet(`Tabelle${index}`)] });
    setActive(model.sheets.length);
    setRange({ anchor: { col: 0, row: 0 }, focus: { col: 0, row: 0 } });
  }
  function finishRename() {
    if (!renaming) return;
    const name = renaming.value
      .replace(/[\\/?*[\]:]/g, "")
      .trim()
      .slice(0, 31);
    const taken = model.sheets.some(
      (item, index) =>
        index !== renaming.index && item.name.toLocaleLowerCase("de-CH") === name.toLocaleLowerCase("de-CH"),
    );
    if (name && !taken && name !== model.sheets[renaming.index].name)
      commit(renameSheet(modelRef.current, renaming.index, name));
    if (taken) setNotice("Diesen Blattnamen gibt es bereits");
    setRenaming(null);
  }
  function switchSheet(index: number) {
    if (editing && !commitEdit()) return;
    setActive(index);
    setRange({ anchor: { col: 0, row: 0 }, focus: { col: 0, row: 0 } });
    setConfirmDelete(null);
  }
  function moveSheet(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= model.sheets.length) return;
    const sheets = [...modelRef.current.sheets];
    const [moved] = sheets.splice(index, 1);
    sheets.splice(target, 0, moved);
    commit({ ...modelRef.current, sheets });
    setActive(target);
  }
  function deleteSheet(index: number) {
    if (model.sheets.length < 2) return;
    commit({ ...modelRef.current, sheets: modelRef.current.sheets.filter((_, position) => position !== index) });
    setActive(Math.max(0, Math.min(index, model.sheets.length - 2)));
    setConfirmDelete(null);
  }

  function downloadCsv() {
    const used = usedRange(sheet);
    const rows: string[][] = [];
    for (let row = 0; row < used.rows; row += 1) {
      const line: string[] = [];
      for (let col = 0; col < used.cols; col += 1) line.push(formatValue(valueAt(col, row), styleAt({ col, row })));
      rows.push(line);
    }
    const blob = new Blob([`﻿${toDelimited(rows, ";")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title} – ${sheet.name}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- Statuszeile ----------
  const stats = (() => {
    if (area.c1 === area.c2 && area.r1 === area.r2) return null;
    let sum = 0;
    let numbers = 0;
    let filled = 0;
    const r2 = Math.min(area.r2, usedRange(sheet).rows);
    const c2 = Math.min(area.c2, usedRange(sheet).cols);
    for (let row = area.r1; row <= r2; row += 1)
      for (let col = area.c1; col <= c2; col += 1) {
        const value = valueAt(col, row);
        if (value === null || value === "") continue;
        filled += 1;
        if (typeof value === "number") {
          sum += value;
          numbers += 1;
        }
      }
    return { sum, numbers, filled };
  })();

  // ---------- Zellen ----------
  const cellStyle = (style: CellStyle | undefined, value: Value): CSSProperties => ({
    fontWeight: style?.b ? 700 : undefined,
    fontStyle: style?.i ? "italic" : undefined,
    textDecoration:
      [style?.u ? "underline" : "", style?.s ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
    color: isError(value) ? "var(--critical)" : style?.color,
    background: style?.fill,
    textAlign:
      style?.align ??
      (typeof value === "number" ? "right" : typeof value === "boolean" || isError(value) ? "center" : "left"),
    verticalAlign: style?.valign === "top" ? "top" : style?.valign === "middle" ? "middle" : "bottom",
    whiteSpace: style?.wrap ? "pre-wrap" : "pre",
    fontSize: style?.size ? `${(style.size * 4) / 3}px` : undefined,
  });

  const fillArea = fillTarget;
  const columns = Array.from({ length: sheet.colCount }, (_, col) => col);
  const showFillHandle = !readOnly && !editing;
  const renderRow = (row: number, frozenTop?: number) => {
    const frozen = frozenTop !== undefined;
    const stickyTop: CSSProperties = frozen ? { position: "sticky", top: frozenTop } : {};
    const cells = columns.map((col) => {
      const key = cellKey(col, row);
      if (mergeAt.covered.has(key)) return null;
      const merge = mergeAt.origin.get(key);
      const cell = sheet.cells[key];
      const value = valueAt(col, row);
      const selected = inArea(area, col, row) || (merge ? overlaps(merge, area) : false);
      const focus = range.focus.col === col && range.focus.row === row;
      const isEditing = editing && editing.pos.col === col && editing.pos.row === row && editing.source === "cell";
      const frozenCol = col < freezeCols;
      const bottomRight = (merge ? merge.r2 : row) === area.r2 && (merge ? merge.c2 : col) === area.c2;
      const classes = [
        selected ? "selected" : "",
        focus ? "focus" : "",
        cell?.s?.border ? "bordered" : "",
        frozenCol ? "frozen-col" : "",
        col === freezeCols - 1 ? "freeze-edge-col" : "",
        row === freezeRows - 1 ? "freeze-edge-row" : "",
        fillArea && inArea(fillArea, col, row) && !inArea(area, col, row) ? "fill-preview" : "",
        isError(value) ? "error" : "",
      ];
      return (
        <td
          key={key}
          colSpan={merge ? merge.c2 - merge.c1 + 1 : undefined}
          rowSpan={merge ? merge.r2 - merge.r1 + 1 : undefined}
          className={classes.filter(Boolean).join(" ")}
          style={{
            ...cellStyle(cell?.s, value),
            ...(frozen ? { ...stickyTop, zIndex: 3 } : {}),
            ...(frozenCol ? { position: "sticky", left: ROWHEAD_W + colLefts[col], zIndex: frozen ? 4 : 2 } : {}),
          }}
          title={isError(value) ? ERROR_HINTS[value.error] : undefined}
          onMouseDown={(event) => onCellMouseDown(event, { col, row })}
          onMouseEnter={() => onCellMouseEnter({ col, row })}
          onDoubleClick={() => startEdit("edit")}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!inArea(area, col, row)) select({ col, row });
            setMenu({ x: event.clientX, y: event.clientY, kind: "cell" });
          }}
        >
          {isEditing ? (
            <input
              className="sheet-cell-editor"
              aria-label={`Zelle ${key} bearbeiten`}
              autoFocus
              value={editing.value}
              spellCheck={false}
              onChange={(event) => {
                setEditing({ ...editing, value: event.target.value });
                setSuggestIndex(0);
                setPoint(null);
              }}
              onKeyDown={onEditorKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
            />
          ) : (
            <span className="sheet-cell-text">{formatValue(value, cell?.s)}</span>
          )}
          {showFillHandle && bottomRight && !fillArea && (
            <span
              className="sheet-fill-handle"
              aria-hidden="true"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                beginDrag({ kind: "fill", start: range.focus });
                setFillTarget(area);
              }}
            />
          )}
        </td>
      );
    });
    return (
      <tr key={row} className={frozen ? "sheet-frozen-row" : undefined} style={{ height: rowHeights[row] }}>
        <th
          scope="row"
          className={`sheet-rowhead ${row >= area.r1 && row <= area.r2 ? "selected" : ""}`}
          style={frozen ? { ...stickyTop, zIndex: 6 } : undefined}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            if (editing && !commitEdit()) return;
            focusGrid();
            if (event.shiftKey) select({ col: 0, row: range.anchor.row }, { col: sheet.colCount - 1, row });
            else select({ col: 0, row }, { col: sheet.colCount - 1, row });
            beginDrag({ kind: "rows", start: { col: 0, row } });
          }}
          onMouseEnter={() => onCellMouseEnter({ col: 0, row })}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!(row >= area.r1 && row <= area.r2)) select({ col: 0, row }, { col: sheet.colCount - 1, row });
            setMenu({ x: event.clientX, y: event.clientY, kind: "cell" });
          }}
        >
          {row + 1}
          {!readOnly && (
            <span
              className="sheet-row-resize"
              onMouseDown={(event) => startResize(event, "row", row)}
              aria-hidden="true"
            />
          )}
        </th>
        {cells}
      </tr>
    );
  };

  const frozenRowsRendered = Array.from({ length: freezeRows }, (_, row) => row);
  const bodyRows: number[] = [];
  for (let row = first; row <= last; row += 1) bodyRows.push(row);
  const totalWidth = ROWHEAD_W + colLefts[sheet.colCount];
  const focusRaw = editing ? editing.value : rawAt(range.focus);
  const refLabel = sameArea(area, {
    c1: range.focus.col,
    r1: range.focus.row,
    c2: range.focus.col,
    r2: range.focus.row,
  })
    ? cellKey(range.focus.col, range.focus.row)
    : areaName(area);
  const fmtLabel = NUMBER_FORMATS.find((item) => item.value === (activeStyle.fmt ?? "general"))?.label ?? "Standard";

  const cellMenu: (MenuItem | "separator")[] = [
    { label: "Ausschneiden", hint: "Ctrl+X", disabled: readOnly, onSelect: () => copy(true) },
    { label: "Kopieren", hint: "Ctrl+C", onSelect: () => copy(false) },
    {
      label: "Einfügen",
      hint: "Ctrl+V",
      disabled: readOnly,
      onSelect: () => {
        if (clip.current) return paste(clip.current.text);
        navigator.clipboard
          ?.readText()
          .then(paste)
          .catch(() => setNotice("Einfügen bitte mit Ctrl+V"));
      },
    },
    "separator",
    { label: "Zeilen oberhalb einfügen", disabled: readOnly, onSelect: () => insert("row", true) },
    { label: "Zeilen unterhalb einfügen", disabled: readOnly, onSelect: () => insert("row", false) },
    { label: "Spalten links einfügen", disabled: readOnly, onSelect: () => insert("col", true) },
    { label: "Spalten rechts einfügen", disabled: readOnly, onSelect: () => insert("col", false) },
    "separator",
    {
      label: area.r1 === area.r2 ? "Zeile löschen" : "Zeilen löschen",
      danger: true,
      disabled: readOnly,
      onSelect: () => remove("row"),
    },
    {
      label: area.c1 === area.c2 ? "Spalte löschen" : "Spalten löschen",
      danger: true,
      disabled: readOnly,
      onSelect: () => remove("col"),
    },
    { label: "Inhalte löschen", hint: "Entf", disabled: readOnly, onSelect: () => clear("content") },
    "separator",
    { label: "Aufsteigend sortieren (A–Z)", disabled: readOnly, onSelect: () => sort(1) },
    { label: "Absteigend sortieren (Z–A)", disabled: readOnly, onSelect: () => sort(-1) },
  ];

  return (
    <div className="office-sheet">
      {!readOnly && (
        <div className="office-ribbon" role="toolbar" aria-label="Tabelle bearbeiten">
          <ToolGroup label="Rückgängig">
            <ToolButton
              label="Rückgängig"
              shortcut="Ctrl+Z"
              icon={<ArrowUUpLeft />}
              disabled={!history.undo.length}
              onClick={undo}
            />
            <ToolButton
              label="Wiederholen"
              shortcut="Ctrl+Y"
              icon={<ArrowUUpRight />}
              disabled={!history.redo.length}
              onClick={redo}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Schrift">
            <ToolPopover
              label="Schriftgrösse"
              className="office-size-picker"
              trigger={<span className="office-select-text">{activeStyle.size ?? 11}</span>}
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map((size) => ({
                    label: String(size),
                    active: (activeStyle.size ?? 11) === size,
                    onSelect: () => applyStyle((style) => ({ ...style, size: size === 11 ? undefined : size })),
                  }))}
                />
              )}
            </ToolPopover>
            <ToolButton
              label="Fett"
              shortcut="Ctrl+B"
              icon={<TextB weight="bold" />}
              active={Boolean(activeStyle.b)}
              onClick={() => toggle("b")}
            />
            <ToolButton
              label="Kursiv"
              shortcut="Ctrl+I"
              icon={<TextItalic />}
              active={Boolean(activeStyle.i)}
              onClick={() => toggle("i")}
            />
            <ToolButton
              label="Unterstrichen"
              shortcut="Ctrl+U"
              icon={<TextUnderline />}
              active={Boolean(activeStyle.u)}
              onClick={() => toggle("u")}
            />
            <ToolButton
              label="Durchgestrichen"
              icon={<TextStrikethrough />}
              active={Boolean(activeStyle.s)}
              onClick={() => toggle("s")}
            />
            <ColorPicker
              label="Schriftfarbe"
              icon={<TextAUnderline />}
              current={activeStyle.color ?? null}
              noneLabel="Automatisch"
              onPick={(color) => applyStyle((style) => ({ ...style, color: color ?? undefined }))}
            />
            <ColorPicker
              label="Füllfarbe"
              icon={<PaintBucket />}
              current={activeStyle.fill ?? null}
              noneLabel="Keine Füllung"
              onPick={(color) => applyStyle((style) => ({ ...style, fill: color ?? undefined }))}
            />
            <ToolButton
              label="Rahmen"
              icon={<SquareHalf />}
              active={Boolean(activeStyle.border)}
              onClick={() => toggle("border")}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Ausrichtung">
            <ToolButton
              label="Linksbündig"
              icon={<TextAlignLeft />}
              active={activeStyle.align === "left"}
              onClick={() => applyStyle((style) => ({ ...style, align: style.align === "left" ? undefined : "left" }))}
            />
            <ToolButton
              label="Zentriert"
              icon={<TextAlignCenter />}
              active={activeStyle.align === "center"}
              onClick={() =>
                applyStyle((style) => ({ ...style, align: style.align === "center" ? undefined : "center" }))
              }
            />
            <ToolButton
              label="Rechtsbündig"
              icon={<TextAlignRight />}
              active={activeStyle.align === "right"}
              onClick={() =>
                applyStyle((style) => ({ ...style, align: style.align === "right" ? undefined : "right" }))
              }
            />
            <ToolButton
              label="Zeilenumbruch"
              icon={<WrapText />}
              active={Boolean(activeStyle.wrap)}
              onClick={() => toggle("wrap")}
            />
            <ToolButton
              label="Zellen verbinden oder trennen"
              icon={<ArrowsMerge />}
              active={merges.some((merge) => overlaps(merge, area))}
              onClick={toggleMerge}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Zahl">
            <ToolPopover
              label="Zahlenformat"
              className="office-format-picker"
              trigger={<span className="office-select-text">{fmtLabel}</span>}
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={NUMBER_FORMATS.map((item) => ({
                    label: item.label,
                    hint: formatValue(
                      item.value === "date" || item.value === "datetime"
                        ? 46300.5
                        : item.value === "time"
                          ? 0.3125
                          : item.value === "percent"
                            ? 0.125
                            : 1234.5,
                      { fmt: item.value },
                    ),
                    active: (activeStyle.fmt ?? "general") === item.value,
                    onSelect: () => setFormat(item.value),
                  }))}
                />
              )}
            </ToolPopover>
            <ToolButton label="Weniger Dezimalstellen" text=",0" onClick={() => changeDecimals(-1)} />
            <ToolButton label="Mehr Dezimalstellen" text=",00" onClick={() => changeDecimals(1)} />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Bearbeiten">
            <ToolButton label="Summe (AutoSumme)" icon={<Sigma />} onClick={autoSum} />
            <ToolButton label="Aufsteigend sortieren" icon={<SortAscending />} onClick={() => sort(1)} />
            <ToolButton label="Absteigend sortieren" icon={<SortDescending />} onClick={() => sort(-1)} />
            <ToolPopover label="Zeilen und Spalten" trigger={<Rows />}>
              {(close) => (
                <MenuList
                  close={close}
                  items={[
                    { label: "Zeilen oberhalb einfügen", onSelect: () => insert("row", true) },
                    { label: "Zeilen unterhalb einfügen", onSelect: () => insert("row", false) },
                    { label: "Spalten links einfügen", onSelect: () => insert("col", true) },
                    { label: "Spalten rechts einfügen", onSelect: () => insert("col", false) },
                    "separator",
                    { label: "Zeilen löschen", danger: true, onSelect: () => remove("row") },
                    { label: "Spalten löschen", danger: true, onSelect: () => remove("col") },
                    "separator",
                    { label: "Spaltenbreite anpassen", onSelect: () => autoFit(range.focus.col) },
                  ]}
                />
              )}
            </ToolPopover>
            <ToolPopover label="Fixieren" trigger={<Snowflake />}>
              {(close) => (
                <MenuList
                  close={close}
                  items={[
                    {
                      label: "Oberste Zeile fixieren",
                      active: freezeRows === 1 && freezeCols === 0,
                      onSelect: () => setFreeze(1, 0),
                    },
                    {
                      label: "Erste Spalte fixieren",
                      active: freezeRows === 0 && freezeCols === 1,
                      onSelect: () => setFreeze(0, 1),
                    },
                    {
                      label: `Bis ${cellKey(range.focus.col, range.focus.row)} fixieren`,
                      hint: "Zeilen darüber, Spalten links",
                      onSelect: () => setFreeze(range.focus.row, range.focus.col),
                    },
                    {
                      label: "Fixierung aufheben",
                      disabled: !freezeRows && !freezeCols,
                      onSelect: () => setFreeze(0, 0),
                    },
                  ]}
                />
              )}
            </ToolPopover>
            <ToolButton label="Inhalte und Formate löschen" icon={<Eraser />} onClick={() => clear("all")} />
          </ToolGroup>
          <ToolSeparator />
          <ToolButton label="Blatt als CSV herunterladen" icon={<DownloadSimple />} text="CSV" onClick={downloadCsv} />
        </div>
      )}
      <div className="sheet-formula-bar">
        <span className="sheet-ref" aria-label="Ausgewählte Zelle">
          {refLabel}
        </span>
        <FunctionIcon className="sheet-fx" aria-hidden="true" />
        <div className="sheet-formula-field">
          <input
            ref={barRef}
            aria-label="Inhalt der Zelle"
            value={focusRaw}
            readOnly={readOnly}
            spellCheck={false}
            onFocus={() => {
              if (!editing && !readOnly) startEdit("edit", undefined, "bar");
            }}
            onChange={(event) => {
              if (!editing) startEdit("edit", event.target.value, "bar");
              else setEditing({ ...editing, value: event.target.value });
              setSuggestIndex(0);
              setPoint(null);
            }}
            onKeyDown={onEditorKeyDown}
          />
          {editing && (suggestions.length > 0 || signature) && (
            <div className="sheet-suggest" role="listbox" aria-label="Funktionen">
              {suggestions.length
                ? suggestions.map((item, index) => (
                    <button
                      key={item.name}
                      type="button"
                      role="option"
                      aria-selected={index === suggestIndex}
                      className={index === suggestIndex ? "active" : ""}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        acceptSuggestion(item.name);
                      }}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.text}</span>
                    </button>
                  ))
                : signature && (
                    <p>
                      <strong>{signature.syntax}</strong>
                      <span>{signature.text}</span>
                    </p>
                  )}
            </div>
          )}
        </div>
      </div>
      {formulaError && (
        <p className="office-inline-error" role="alert">
          {formulaError}
        </p>
      )}
      <div
        ref={gridRef}
        className={`sheet-grid ${pointMode ? "point-mode" : ""}`}
        tabIndex={0}
        role="grid"
        aria-label={`Blatt ${sheet.name}`}
        aria-rowcount={sheet.rowCount}
        aria-colcount={sheet.colCount}
        onKeyDown={onGridKeyDown}
        onCopy={(event) => {
          if (editing) return;
          event.preventDefault();
          copy(false, event.clipboardData);
        }}
        onCut={(event) => {
          if (editing || readOnly) return;
          event.preventDefault();
          copy(true, event.clipboardData);
        }}
        onPaste={(event) => {
          if (editing || readOnly) return;
          event.preventDefault();
          paste(event.clipboardData.getData("text/plain"));
        }}
      >
        <table className="sheet-table" style={{ width: totalWidth }}>
          <colgroup>
            <col style={{ width: ROWHEAD_W }} />
            {colWidths.map((width, col) => (
              <col key={col} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ height: HEADER_H }}>
              <th
                className="sheet-corner"
                aria-label="Alles auswählen"
                onMouseDown={(event) => {
                  event.preventDefault();
                  select({ col: 0, row: 0 }, { col: sheet.colCount - 1, row: sheet.rowCount - 1 });
                  focusGrid();
                }}
              />
              {colWidths.map((_, col) => (
                <th
                  key={col}
                  scope="col"
                  className={`sheet-colhead ${col >= area.c1 && col <= area.c2 ? "selected" : ""}`}
                  style={col < freezeCols ? { left: ROWHEAD_W + colLefts[col], zIndex: 8 } : undefined}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    if (editing && !commitEdit()) return;
                    focusGrid();
                    if (event.shiftKey) select({ col: range.anchor.col, row: 0 }, { col, row: sheet.rowCount - 1 });
                    else select({ col, row: 0 }, { col, row: sheet.rowCount - 1 });
                    drag.current = { kind: "cols", start: { col, row: 0 } };
                  }}
                  onMouseEnter={() => onCellMouseEnter({ col, row: 0 })}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (!(col >= area.c1 && col <= area.c2)) select({ col, row: 0 }, { col, row: sheet.rowCount - 1 });
                    setMenu({ x: event.clientX, y: event.clientY, kind: "cell" });
                  }}
                >
                  {columnName(col)}
                  {!readOnly && (
                    <span
                      className="sheet-col-resize"
                      aria-hidden="true"
                      onMouseDown={(event) => startResize(event, "col", col)}
                      onDoubleClick={() => autoFit(col)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frozenRowsRendered.map((row) => (
              <RowSlot key={row} render={renderRow} row={row} frozenTop={HEADER_H + rowTops[row]} />
            ))}
            {first > freezeRows && (
              <tr aria-hidden="true" style={{ height: rowTops[first] - rowTops[freezeRows] }}>
                <td colSpan={sheet.colCount + 1} className="sheet-spacer" />
              </tr>
            )}
            {bodyRows.map((row) => (
              <RowSlot key={row} render={renderRow} row={row} />
            ))}
            {last < sheet.rowCount - 1 && (
              <tr aria-hidden="true" style={{ height: rowTops[sheet.rowCount] - rowTops[last + 1] }}>
                <td colSpan={sheet.colCount + 1} className="sheet-spacer" />
              </tr>
            )}
          </tbody>
        </table>
        {!readOnly && (
          <div className="sheet-more" style={{ width: totalWidth }}>
            <button
              type="button"
              disabled={sheet.rowCount >= 10_000}
              onClick={() =>
                commitSheet((current) => ({ ...current, rowCount: Math.min(10_000, current.rowCount + 100) }))
              }
            >
              <Plus aria-hidden="true" /> 100 weitere Zeilen
            </button>
            <button
              type="button"
              disabled={sheet.colCount >= 200}
              onClick={() => commitSheet((current) => ({ ...current, colCount: Math.min(200, current.colCount + 10) }))}
            >
              <Columns aria-hidden="true" /> 10 weitere Spalten
            </button>
          </div>
        )}
      </div>
      <footer className="sheet-footer">
        <div className="sheet-tabs" role="tablist" aria-label="Blätter">
          {model.sheets.map((item, index) =>
            renaming?.index === index ? (
              <input
                key={item.id}
                className="sheet-tab-rename"
                aria-label="Blattname"
                autoFocus
                maxLength={31}
                value={renaming.value}
                onChange={(event) => setRenaming({ index, value: event.target.value })}
                onBlur={finishRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") finishRename();
                  if (event.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                className={index === active ? "active" : ""}
                onClick={() => switchSheet(index)}
                onDoubleClick={() => !readOnly && setRenaming({ index, value: item.name })}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (readOnly) return;
                  switchSheet(index);
                  setMenu({ x: event.clientX, y: event.clientY, kind: "tab", sheet: index });
                }}
              >
                {item.name}
              </button>
            ),
          )}
          {!readOnly && (
            <button
              type="button"
              className="sheet-tab-add"
              aria-label="Blatt hinzufügen"
              title="Blatt hinzufügen"
              onClick={addSheet}
            >
              <Plus aria-hidden="true" />
            </button>
          )}
        </div>
        {confirmDelete !== null && (
          <span className="sheet-confirm" role="alert">
            Blatt „{model.sheets[confirmDelete]?.name}“ löschen?
            <button type="button" className="danger" onClick={() => deleteSheet(confirmDelete)}>
              Löschen
            </button>
            <button type="button" onClick={() => setConfirmDelete(null)}>
              Abbrechen
            </button>
          </span>
        )}
        <span className="sheet-stats" aria-live="polite">
          {stats && stats.filled > 0 && (
            <>
              {stats.numbers > 0 && (
                <>
                  <span>Summe: {formatValue(stats.sum, activeStyle)}</span>
                  <span>
                    Mittelwert:{" "}
                    {formatValue(stats.sum / stats.numbers, { ...activeStyle, dec: activeStyle.fmt ? undefined : 2 })}
                  </span>
                </>
              )}
              <span>Anzahl: {stats.filled}</span>
            </>
          )}
        </span>
      </footer>
      {menu &&
        createPortal(
          <div
            className="office-context"
            style={{ top: Math.min(menu.y, window.innerHeight - 420), left: Math.min(menu.x, window.innerWidth - 260) }}
            onMouseLeave={() => setMenu(null)}
          >
            <MenuList
              close={() => setMenu(null)}
              items={
                menu.kind === "cell"
                  ? cellMenu
                  : [
                      {
                        label: "Umbenennen",
                        onSelect: () => setRenaming({ index: menu.sheet!, value: model.sheets[menu.sheet!].name }),
                      },
                      {
                        label: "Duplizieren",
                        onSelect: () => {
                          const base = model.sheets[menu.sheet!].name.slice(0, 24);
                          let name = `${base} (2)`;
                          for (
                            let index = 3;
                            model.sheets.some(
                              (item) => item.name.toLocaleLowerCase("de-CH") === name.toLocaleLowerCase("de-CH"),
                            );
                            index += 1
                          )
                            name = `${base} (${index})`;
                          commit(duplicateSheet(modelRef.current, menu.sheet!, name));
                          setActive(menu.sheet! + 1);
                        },
                      },
                      {
                        label: "Nach links verschieben",
                        disabled: menu.sheet === 0,
                        onSelect: () => moveSheet(menu.sheet!, -1),
                      },
                      {
                        label: "Nach rechts verschieben",
                        disabled: menu.sheet === model.sheets.length - 1,
                        onSelect: () => moveSheet(menu.sheet!, 1),
                      },
                      "separator",
                      {
                        label: "Löschen",
                        danger: true,
                        disabled: model.sheets.length < 2,
                        onSelect: () => setConfirmDelete(menu.sheet!),
                      },
                    ]
              }
            />
          </div>,
          document.body,
        )}
      {menu && <div className="office-context-backdrop" onMouseDown={() => setMenu(null)} />}
      {notice && (
        <div className="office-toast" role="status">
          {notice}
        </div>
      )}
      {printing && <SheetPrint model={model} active={active} valueOf={(col, row) => valueAt(col, row)} />}
    </div>
  );
}

// Zeile als eigener Baustein: die Maus- und Tastaturhandler darin greifen erst bei Ereignissen auf den Zustand zu.
function RowSlot({
  render,
  row,
  frozenTop,
}: {
  render: (row: number, frozenTop?: number) => React.ReactNode;
  row: number;
  frozenTop?: number;
}) {
  return render(row, frozenTop);
}

function SheetPrint({
  model,
  active,
  valueOf,
}: {
  model: SheetModel;
  active: number;
  valueOf: (col: number, row: number) => Value;
}) {
  const sheet = model.sheets[active];
  const used = usedRange(sheet);
  const merges = mergesOf(sheet);
  const covered = new Set<string>();
  for (const merge of merges)
    for (let row = merge.r1; row <= merge.r2; row += 1)
      for (let col = merge.c1; col <= merge.c2; col += 1)
        if (row !== merge.r1 || col !== merge.c1) covered.add(cellKey(col, row));
  const rows = [];
  for (let row = 0; row < used.rows; row += 1) {
    const cells = [];
    for (let col = 0; col < used.cols; col += 1) {
      const key = cellKey(col, row);
      if (covered.has(key)) continue;
      const merge = merges.find((item) => item.c1 === col && item.r1 === row);
      const cell = sheet.cells[key];
      const value = valueOf(col, row);
      cells.push(
        <td
          key={key}
          colSpan={merge ? merge.c2 - merge.c1 + 1 : undefined}
          rowSpan={merge ? merge.r2 - merge.r1 + 1 : undefined}
          className={cell?.s?.border ? "bordered" : ""}
          style={{
            fontWeight: cell?.s?.b ? 700 : undefined,
            fontStyle: cell?.s?.i ? "italic" : undefined,
            color: cell?.s?.color,
            background: cell?.s?.fill,
            textAlign: cell?.s?.align ?? (typeof value === "number" ? "right" : "left"),
            whiteSpace: cell?.s?.wrap ? "pre-wrap" : "pre",
          }}
        >
          {formatValue(value, cell?.s)}
        </td>,
      );
    }
    rows.push(<tr key={row}>{cells}</tr>);
  }
  return (
    <div className="office-print-only sheet-print">
      <h1>{sheet.name}</h1>
      <table>
        <colgroup>
          {Array.from({ length: used.cols }, (_, col) => (
            <col key={col} style={{ width: sheet.cols[String(col)] ?? DEFAULT_COL_WIDTH }} />
          ))}
        </colgroup>
        <tbody>{rows}</tbody>
      </table>
      <style>{"@media print { @page { size: A4 landscape; margin: 12mm; } }"}</style>
    </div>
  );
}
