import { createZip, readZip, type ZipEntry } from "@/lib/zip";
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  cleanModel,
  decimalsOf,
  evaluateWorkbook,
  newSheet,
  type CellStyle,
  type NumberFormat,
  type Sheet,
  type SheetModel,
} from "./model";
import {
  cellKey,
  fromExcelFormula,
  isError,
  parseCellKey,
  parseInput,
  shiftFormula,
  toExcelFormula,
  type Value,
} from "./formula";
import {
  MODEL_PART,
  REL,
  XML_HEAD,
  appProps,
  contentTypes,
  coreProps,
  packModel,
  relationships,
  resolvePart,
  rootRels,
  sha256,
  unpackModel,
} from "./package";
import { child, childrenOf, esc, find, findAll, parseXml, textOf, type XmlNode } from "./xml";

// Excel-Arbeitsmappe (.xlsx) aus der Tabelle der Ablage schreiben und wieder lesen.

const MAIN =
  'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function numberFormatCode(style: CellStyle): string | null {
  const fmt = style.fmt ?? "general";
  const decimals = decimalsOf(style);
  const fraction = decimals > 0 ? `.${"0".repeat(decimals)}` : "";
  switch (fmt) {
    case "number":
      return `#,##0${fraction}`;
    case "integer":
      return "#,##0";
    case "percent":
      return `0${fraction}%`;
    case "chf":
      return `"CHF "#,##0${fraction}`;
    case "eur":
      return `#,##0${fraction}" €"`;
    case "date":
      return "dd.mm.yyyy";
    case "time":
      return "hh:mm";
    case "datetime":
      return "dd.mm.yyyy hh:mm";
    case "text":
      return "@";
    default:
      return style.dec !== undefined ? `0${fraction}` : null;
  }
}

const argb = (color: string) => `FF${color.slice(1).toUpperCase()}`;

class StyleTable {
  fonts = ['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>'];
  fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  borders = [
    "<border><left/><right/><top/><bottom/><diagonal/></border>",
    '<border><left style="thin"><color rgb="FFBFC9CA"/></left><right style="thin"><color rgb="FFBFC9CA"/></right><top style="thin"><color rgb="FFBFC9CA"/></top><bottom style="thin"><color rgb="FFBFC9CA"/></bottom><diagonal/></border>',
  ];
  numFmts: string[] = [];
  xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  private index = new Map<string, number>();

  private add(list: string[], value: string) {
    const found = list.indexOf(value);
    if (found >= 0) return found;
    list.push(value);
    return list.length - 1;
  }

  id(style: CellStyle | undefined) {
    if (!style || !Object.keys(style).length) return 0;
    const key = JSON.stringify(style);
    const known = this.index.get(key);
    if (known !== undefined) return known;
    const font = this.add(
      this.fonts,
      `<font>${style.b ? "<b/>" : ""}${style.i ? "<i/>" : ""}${style.s ? "<strike/>" : ""}${style.u ? "<u/>" : ""}<sz val="${style.size ?? 11}"/>${style.color ? `<color rgb="${argb(style.color)}"/>` : '<color theme="1"/>'}<name val="Calibri"/><family val="2"/></font>`,
    );
    const fill = style.fill
      ? this.add(
          this.fills,
          `<fill><patternFill patternType="solid"><fgColor rgb="${argb(style.fill)}"/><bgColor indexed="64"/></patternFill></fill>`,
        )
      : 0;
    const code = numberFormatCode(style);
    let numFmt = 0;
    if (code === "@") numFmt = 49;
    else if (code) numFmt = 164 + this.add(this.numFmts, code);
    const alignment =
      style.align || style.valign || style.wrap
        ? `<alignment${style.align ? ` horizontal="${style.align}"` : ""}${style.valign ? ` vertical="${style.valign === "middle" ? "center" : style.valign}"` : ""}${style.wrap ? ' wrapText="1"' : ""}/>`
        : "";
    const xf = `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="${style.border ? 1 : 0}" xfId="0"${numFmt ? ' applyNumberFormat="1"' : ""}${font ? ' applyFont="1"' : ""}${fill ? ' applyFill="1"' : ""}${style.border ? ' applyBorder="1"' : ""}${alignment ? ` applyAlignment="1">${alignment}</xf>` : "/>"}`;
    this.xfs.push(xf);
    this.index.set(key, this.xfs.length - 1);
    return this.xfs.length - 1;
  }

  xml() {
    const numFmts = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((code, index) => `<numFmt numFmtId="${164 + index}" formatCode="${esc(code)}"/>`).join("")}</numFmts>`
      : "";
    return `${XML_HEAD}<styleSheet ${MAIN}>${numFmts}<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts><fills count="${this.fills.length}">${this.fills.join("")}</fills><borders count="${this.borders.length}">${this.borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

const excelWidth = (px: number) => Math.round(((px - 5) / 7) * 100) / 100;
const pxWidth = (chars: number) => Math.round(chars * 7 + 5);

function cellXml(ref: string, raw: string, style: number, value: Value) {
  const s = style ? ` s="${style}"` : "";
  const input = parseInput(raw);
  if (input.type === "formula") {
    const formula = toExcelFormula(input.formula);
    if (formula === null) return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(raw)}</t></is></c>`;
    let cached = "";
    let type = "";
    if (isError(value)) {
      if (value.error !== "#CYCLE!") {
        type = ' t="e"';
        cached = `<v>${esc(value.error)}</v>`;
      }
    } else if (typeof value === "number") cached = `<v>${value}</v>`;
    else if (typeof value === "boolean") {
      type = ' t="b"';
      cached = `<v>${value ? 1 : 0}</v>`;
    } else if (typeof value === "string") {
      type = ' t="str"';
      cached = `<v>${esc(value)}</v>`;
    }
    return `<c r="${ref}"${s}${type}><f>${esc(formula)}</f>${cached}</c>`;
  }
  if (input.type === "empty") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number") return `<c r="${ref}"${s}><v>${value}</v></c>`;
  if (typeof value === "boolean") return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  const text = typeof value === "string" ? value : raw;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}

function sheetXml(sheet: Sheet, index: number, styles: StyleTable, values: Map<string, Value>) {
  const byRow = new Map<number, { col: number; key: string }[]>();
  for (const key of Object.keys(sheet.cells)) {
    const ref = parseCellKey(key);
    if (!ref) continue;
    if (!byRow.has(ref.row)) byRow.set(ref.row, []);
    byRow.get(ref.row)!.push({ col: ref.col, key });
  }
  for (const key of Object.keys(sheet.rows)) if (!byRow.has(Number(key))) byRow.set(Number(key), []);
  const rows = [...byRow.entries()].sort((a, b) => a[0] - b[0]);
  const data = rows
    .map(([row, cells]) => {
      const height = sheet.rows[String(row)];
      const content = cells
        .sort((a, b) => a.col - b.col)
        .map(({ key }) => {
          const cell = sheet.cells[key];
          const raw = cell.s?.fmt === "text" && !cell.v.startsWith("=") ? `'${cell.v}` : cell.v;
          return cellXml(key, raw, styles.id(cell.s), values.get(key) ?? null);
        })
        .join("");
      return `<row r="${row + 1}"${height ? ` ht="${Math.round(height * 0.75 * 100) / 100}" customHeight="1"` : ""}>${content}</row>`;
    })
    .join("");
  const cols = Object.entries(sheet.cols)
    .map(([col, width]) => [Number(col), width] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([col, width]) => `<col min="${col + 1}" max="${col + 1}" width="${excelWidth(width)}" customWidth="1"/>`)
    .join("");
  const { rows: frozenRows, cols: frozenCols } = sheet.freeze;
  let pane = "";
  if (frozenRows || frozenCols) {
    const active = frozenRows && frozenCols ? "bottomRight" : frozenRows ? "bottomLeft" : "topRight";
    pane = `<pane${frozenCols ? ` xSplit="${frozenCols}"` : ""}${frozenRows ? ` ySplit="${frozenRows}"` : ""} topLeftCell="${cellKey(frozenCols, frozenRows)}" activePane="${active}" state="frozen"/><selection pane="${active}"/>`;
  }
  const merges = sheet.merges.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`
    : "";
  return `${XML_HEAD}<worksheet ${MAIN}><sheetViews><sheetView workbookViewId="0"${index === 0 ? ' tabSelected="1"' : ""}>${pane}</sheetView></sheetViews><sheetFormatPr defaultColWidth="${excelWidth(DEFAULT_COL_WIDTH)}" defaultRowHeight="${DEFAULT_ROW_HEIGHT * 0.75}"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${data}</sheetData>${merges}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}

const checkOf = (files: Map<string, Buffer> | ZipEntry[]) => {
  const list = Array.isArray(files) ? files.map((entry) => [entry.path, entry.content] as const) : [...files.entries()];
  return sha256(
    Buffer.concat(
      list
        .filter(([path]) => path === "xl/workbook.xml" || path.startsWith("xl/worksheets/sheet"))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, content]) => content),
    ),
  );
};

export function buildXlsx(model: SheetModel, meta: { title: string; author: string }) {
  const styles = new StyleTable();
  const results = evaluateWorkbook(model).all();
  const sheets = model.sheets.map((sheet, index) => sheetXml(sheet, index, styles, results[index]));
  const workbook = `${XML_HEAD}<workbook ${MAIN}><bookViews><workbookView/></bookViews><sheets>${model.sheets
    .map((sheet, index) => `<sheet name="${esc(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
  const rels = relationships([
    ...model.sheets.map((_, index) => ({
      id: `rId${index + 1}`,
      type: REL.worksheet,
      target: `worksheets/sheet${index + 1}.xml`,
    })),
    { id: `rId${model.sheets.length + 1}`, type: REL.styles, target: "styles.xml" },
  ]);
  const main = "application/vnd.openxmlformats-officedocument.spreadsheetml";
  const entries: ZipEntry[] = [
    {
      path: "[Content_Types].xml",
      content: Buffer.from(
        contentTypes(
          [
            ["/xl/workbook.xml", `${main}.sheet.main+xml`],
            ["/xl/styles.xml", `${main}.styles+xml`],
            ...model.sheets.map(
              (_, index) => [`/xl/worksheets/sheet${index + 1}.xml`, `${main}.worksheet+xml`] as [string, string],
            ),
          ],
          false,
        ),
      ),
    },
    { path: "_rels/.rels", content: Buffer.from(rootRels("xl/workbook.xml")) },
    { path: "docProps/core.xml", content: Buffer.from(coreProps(meta.title, meta.author)) },
    { path: "docProps/app.xml", content: Buffer.from(appProps()) },
    { path: "xl/workbook.xml", content: Buffer.from(workbook) },
    { path: "xl/_rels/workbook.xml.rels", content: Buffer.from(rels) },
    { path: "xl/styles.xml", content: Buffer.from(styles.xml()) },
    ...sheets.map((xml, index) => ({ path: `xl/worksheets/sheet${index + 1}.xml`, content: Buffer.from(xml) })),
  ];
  entries.push({ path: MODEL_PART, content: packModel(model, checkOf(entries), new Map()) });
  return createZip(entries);
}

// ---------- Lesen ----------

const BUILTIN_FORMATS: Record<number, NumberFormat> = {
  1: "integer",
  2: "number",
  3: "integer",
  4: "number",
  9: "percent",
  10: "percent",
  14: "date",
  15: "date",
  16: "date",
  17: "date",
  20: "time",
  21: "time",
  22: "datetime",
  49: "text",
};

function formatOfCode(code: string): { fmt: NumberFormat; dec?: number } {
  const lower = code
    .replace(/"[^"]*"/g, (match) => (/chf/i.test(match) ? "chf" : match.includes("€") ? "eur" : ""))
    .replace(/\[[^\]]*\]/g, (match) => (/chf/i.test(match) ? "chf" : match.includes("€") ? "eur" : ""))
    .toLowerCase();
  const decimals = /0\.(0+)/.exec(code)?.[1].length ?? 0;
  if (lower.includes("chf")) return { fmt: "chf", dec: decimals };
  if (lower.includes("€") || lower.includes("eur")) return { fmt: "eur", dec: decimals };
  if (code.includes("%")) return { fmt: "percent", dec: decimals };
  if (/[dy]/.test(lower) && /h/.test(lower)) return { fmt: "datetime" };
  if (/[dy]/.test(lower)) return { fmt: "date" };
  if (/h/.test(lower)) return { fmt: "time" };
  if (code === "@") return { fmt: "text" };
  if (code.includes("#,##0") || code.includes("0"))
    return decimals ? { fmt: "number", dec: decimals } : { fmt: "integer" };
  return { fmt: "general" };
}

function colorOf(node: XmlNode | undefined) {
  const rgb = node?.attrs.rgb;
  return rgb && /^[0-9a-f]{8}$/i.test(rgb) ? `#${rgb.slice(2).toLowerCase()}` : undefined;
}

function readStyles(xml: Buffer | undefined): CellStyle[] {
  if (!xml) return [];
  const root = parseXml(xml.toString("utf8"));
  const codes = new Map<number, string>();
  for (const numFmt of findAll(root, "numFmt")) codes.set(Number(numFmt.attrs.numFmtId), numFmt.attrs.formatCode);
  const fonts = childrenOf(find(root, "fonts"), "font");
  const fills = childrenOf(find(root, "fills"), "fill");
  const borders = childrenOf(find(root, "borders"), "border");
  return childrenOf(find(root, "cellXfs"), "xf").map((xf) => {
    const style: CellStyle = {};
    const font = fonts[Number(xf.attrs.fontId ?? 0)];
    if (font) {
      if (child(font, "b") && child(font, "b")?.attrs.val !== "0") style.b = true;
      if (child(font, "i") && child(font, "i")?.attrs.val !== "0") style.i = true;
      if (child(font, "u")) style.u = true;
      if (child(font, "strike")) style.s = true;
      const color = colorOf(child(font, "color"));
      if (color && color !== "#000000") style.color = color;
      const size = Number(child(font, "sz")?.attrs.val);
      if (size && size !== 11) style.size = Math.round(size);
    }
    const pattern = child(fills[Number(xf.attrs.fillId ?? 0)], "patternFill");
    if (pattern?.attrs.patternType === "solid") {
      const fill = colorOf(child(pattern, "fgColor"));
      if (fill && fill !== "#ffffff") style.fill = fill;
    }
    const border = borders[Number(xf.attrs.borderId ?? 0)];
    if (border && ["left", "right", "top", "bottom"].some((side) => child(border, side)?.attrs.style))
      style.border = true;
    const id = Number(xf.attrs.numFmtId ?? 0);
    const code = codes.get(id);
    const format = code ? formatOfCode(code) : BUILTIN_FORMATS[id] ? { fmt: BUILTIN_FORMATS[id] } : null;
    if (format && format.fmt !== "general") {
      style.fmt = format.fmt;
      if ("dec" in format && format.dec !== undefined && format.dec !== decimalsOf({ fmt: format.fmt }))
        style.dec = format.dec;
    }
    const alignment = child(xf, "alignment");
    const horizontal = alignment?.attrs.horizontal;
    if (horizontal === "left" || horizontal === "center" || horizontal === "right") style.align = horizontal;
    const vertical = alignment?.attrs.vertical;
    if (vertical === "top" || vertical === "bottom") style.valign = vertical;
    if (vertical === "center") style.valign = "middle";
    if (alignment?.attrs.wrapText === "1") style.wrap = true;
    return style;
  });
}

// Text aus der Datei so ablegen, dass er Text bleibt („007“, „=“ am Anfang, Datum als Text).
const asText = (text: string) => (parseInput(text).type === "text" && !text.startsWith("'") ? text : `'${text}`);

function readSheet(xml: Buffer, name: string, shared: string[], styles: CellStyle[]): Sheet {
  const root = parseXml(xml.toString("utf8"));
  const sheet = newSheet(name);
  const sharedFormulas = new Map<string, { formula: string; col: number; row: number }>();
  let maxRow = 0;
  let maxCol = 0;
  for (const row of findAll(find(root, "sheetData"), "row")) {
    const rowIndex = Number(row.attrs.r) - 1;
    if (row.attrs.customHeight === "1" && row.attrs.ht)
      sheet.rows[String(rowIndex)] = Math.round(Number(row.attrs.ht) / 0.75);
    for (const c of childrenOf(row, "c")) {
      const ref = parseCellKey(c.attrs.r ?? "");
      if (!ref || ref.row >= 10_000 || ref.col >= 200) continue;
      const style = styles[Number(c.attrs.s ?? 0)];
      const f = child(c, "f");
      const v = child(c, "v");
      let raw = "";
      if (f) {
        let formula = textOf(f);
        if (f.attrs.t === "shared" && f.attrs.si !== undefined) {
          const master = sharedFormulas.get(f.attrs.si);
          if (formula) sharedFormulas.set(f.attrs.si, { formula, col: ref.col, row: ref.row });
          else if (master) formula = shiftFormula(master.formula, ref.col - master.col, ref.row - master.row);
        }
        if (formula) raw = `=${fromExcelFormula(formula)}`;
      }
      if (!raw) {
        const type = c.attrs.t;
        if (type === "s") raw = asText(shared[Number(textOf(v))] ?? "");
        else if (type === "inlineStr") raw = asText(textOf(child(c, "is")));
        else if (type === "str") raw = asText(textOf(v));
        else if (type === "b") raw = textOf(v) === "1" ? "WAHR" : "FALSCH";
        else if (type === "e") raw = asText(textOf(v));
        else raw = textOf(v);
      }
      const cleanStyle = style && Object.keys(style).length ? style : undefined;
      if (!raw && !cleanStyle) continue;
      sheet.cells[cellKey(ref.col, ref.row)] = cleanStyle ? { v: raw, s: cleanStyle } : { v: raw };
      maxRow = Math.max(maxRow, ref.row + 1);
      maxCol = Math.max(maxCol, ref.col + 1);
    }
  }
  for (const col of findAll(find(root, "cols"), "col")) {
    const width = Number(col.attrs.width);
    if (!width || col.attrs.customWidth === "0") continue;
    for (let index = Number(col.attrs.min) - 1; index < Math.min(Number(col.attrs.max), 200); index += 1)
      if (Math.abs(pxWidth(width) - DEFAULT_COL_WIDTH) > 2) sheet.cols[String(index)] = pxWidth(width);
  }
  sheet.merges = findAll(find(root, "mergeCells"), "mergeCell")
    .map((merge) => merge.attrs.ref)
    .filter((ref): ref is string => typeof ref === "string" && ref.includes(":"));
  const pane = find(find(root, "sheetViews"), "pane");
  if (pane?.attrs.state === "frozen" || pane?.attrs.state === "frozenSplit")
    sheet.freeze = {
      rows: Math.trunc(Number(pane.attrs.ySplit ?? 0)),
      cols: Math.trunc(Number(pane.attrs.xSplit ?? 0)),
    };
  sheet.rowCount = Math.min(10_000, Math.max(100, maxRow + 20));
  sheet.colCount = Math.min(200, Math.max(26, maxCol + 2));
  return sheet;
}

export function readXlsx(bytes: Buffer): { model: SheetModel; imported: boolean } {
  const files = readZip(bytes);
  const workbookXml = files.get("xl/workbook.xml");
  if (!workbookXml) throw new Error("Keine Excel-Arbeitsmappe.");
  const stored = files.get(MODEL_PART);
  if (stored) {
    try {
      const parsed = unpackModel(stored, files);
      if (parsed.check === checkOf(files))
        return { model: cleanModel("sheet", parsed.model) as SheetModel, imported: false };
    } catch {
      // Beschädigtes Modell: aus der Datei lesen.
    }
  }
  const rels = new Map<string, string>();
  const relsXml = files.get("xl/_rels/workbook.xml.rels");
  if (relsXml)
    for (const rel of findAll(parseXml(relsXml.toString("utf8")), "Relationship"))
      rels.set(rel.attrs.Id, resolvePart("xl/workbook.xml", rel.attrs.Target));
  const shared: string[] = [];
  const sharedXml = files.get("xl/sharedStrings.xml");
  if (sharedXml)
    for (const si of findAll(parseXml(sharedXml.toString("utf8")), "si"))
      // Lautschrift (rPh) gehört nicht zum Text.
      shared.push(
        si.children
          .filter((part) => part.name !== "rPh")
          .map(textOf)
          .join(""),
      );
  const styles = readStyles(files.get("xl/styles.xml"));
  const sheets = findAll(parseXml(workbookXml.toString("utf8")), "sheet").flatMap((entry) => {
    const path = rels.get(entry.attrs.id ?? "");
    const xml = path ? files.get(path) : undefined;
    return xml ? [readSheet(xml, entry.attrs.name ?? "Tabelle", shared, styles)] : [];
  });
  return { model: cleanModel("sheet", { kind: "sheet", sheets }) as SheetModel, imported: true };
}
