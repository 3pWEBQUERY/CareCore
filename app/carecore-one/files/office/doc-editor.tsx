"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableCell, TableHeader, TableKit } from "@tiptap/extension-table";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsMerge,
  ArrowsSplit,
  ColumnsPlusLeft,
  ColumnsPlusRight,
  Eraser,
  FileDashed,
  GearSix,
  HighlighterCircle,
  Image as ImageIcon,
  LinkSimple,
  ListBullets,
  ListChecks,
  ListNumbers,
  MagnifyingGlass,
  Minus,
  PaintBucket,
  RowsPlusBottom,
  RowsPlusTop,
  Table,
  TextAUnderline,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextIndent,
  TextItalic,
  TextOutdent,
  TextStrikethrough,
  TextUnderline,
  Trash,
} from "@phosphor-icons/react";
import { DEFAULT_PAGE, MARGINS_MM, type DocNode, type DocumentModel, type PageSetup } from "@/lib/office/model";
import type { EditorProps } from "./editor-props";
import { ColorPicker, MenuList, ToolButton, ToolGroup, ToolPopover, ToolSeparator, imageToDataUrl } from "./office-ui";

// Seitenumbruch wie in Word (Ctrl+Enter); erscheint im Editor als gestrichelte Linie.
const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-page-break": "", class: "office-page-break" }),
    "Seitenumbruch",
  ],
  addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.insertContent({ type: this.name }) };
  },
});

// Zellen mit Hintergrundfarbe (Schattierung wie in Word).
const shading = {
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.backgroundColor ? { style: `background-color: ${String(attributes.backgroundColor)}` } : {},
  },
};
const ShadedCell = TableCell.extend({
  addAttributes: function () {
    return { ...this.parent?.(), ...shading };
  },
});
const ShadedHeader = TableHeader.extend({
  addAttributes: function () {
    return { ...this.parent?.(), ...shading };
  },
});

const STYLES = [
  { id: "paragraph", label: "Standard", hint: "Fliesstext" },
  { id: "h1", label: "Überschrift 1", hint: "Titel" },
  { id: "h2", label: "Überschrift 2", hint: "Abschnitt" },
  { id: "h3", label: "Überschrift 3", hint: "Unterabschnitt" },
  { id: "quote", label: "Zitat", hint: "Hervorgehoben" },
] as const;
const FONTS = ["Calibri", "Arial", "Georgia", "Times New Roman", "Verdana", "Courier New"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const ZOOMS = [75, 90, 100, 110, 125, 150];

type Match = { from: number; to: number };

// Treffer der Suche über ganze Absätze hinweg (auch über Formatwechsel innerhalb eines Absatzes).
function findMatches(editor: Editor, query: string, caseSensitive: boolean): Match[] {
  if (!query) return [];
  const matches: Match[] = [];
  const needle = caseSensitive ? query : query.toLocaleLowerCase("de-CH");
  editor.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const positions: number[] = [];
    node.forEach((child, offset) => {
      const content = child.isText ? (child.text ?? "") : "￼";
      for (let index = 0; index < content.length; index += 1) {
        text += content[index];
        positions.push(pos + 1 + offset + index);
      }
    });
    const haystack = caseSensitive ? text : text.toLocaleLowerCase("de-CH");
    for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length))
      matches.push({ from: positions[at], to: positions[at + needle.length - 1] + 1 });
    return false;
  });
  return matches;
}

function FindPanel({ editor, close }: { editor: Editor; close: () => void }) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [result, setResult] = useState("");
  const matches = () => findMatches(editor, query, caseSensitive);
  function next() {
    const list = matches();
    if (!list.length) return setResult("Keine Treffer");
    const after = list.find((match) => match.from >= editor.state.selection.to) ?? list[0];
    editor.chain().focus().setTextSelection(after).scrollIntoView().run();
    setResult(`Treffer ${list.indexOf(after) + 1} von ${list.length}`);
  }
  function replaceOne() {
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to);
    const same = caseSensitive
      ? selected === query
      : selected.toLocaleLowerCase("de-CH") === query.toLocaleLowerCase("de-CH");
    if (query && same) editor.chain().focus().insertContentAt({ from, to }, replacement).run();
    next();
  }
  function replaceAll() {
    const list = matches();
    if (!list.length) return setResult("Keine Treffer");
    editor.commands.focus();
    const transaction = editor.state.tr;
    for (const match of [...list].reverse()) transaction.insertText(replacement, match.from, match.to);
    editor.view.dispatch(transaction);
    setResult(`${list.length} ersetzt`);
  }
  return (
    <div className="office-form">
      <label>
        <span>Suchen</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setResult("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              next();
            }
          }}
        />
      </label>
      <label>
        <span>Ersetzen durch</span>
        <input value={replacement} onChange={(event) => setReplacement(event.target.value)} />
      </label>
      <button
        type="button"
        className={`office-toggle ${caseSensitive ? "active" : ""}`}
        aria-pressed={caseSensitive}
        onClick={() => setCaseSensitive((value) => !value)}
      >
        Gross-/Kleinschreibung beachten
      </button>
      <div className="office-form-actions">
        <button type="button" onClick={next} disabled={!query}>
          Weitersuchen
        </button>
        <button type="button" onClick={replaceOne} disabled={!query}>
          Ersetzen
        </button>
        <button type="button" onClick={replaceAll} disabled={!query}>
          Alle ersetzen
        </button>
        <button type="button" onClick={close}>
          Schliessen
        </button>
      </div>
      {result && (
        <p className="office-form-result" role="status">
          {result}
        </p>
      )}
    </div>
  );
}

function LinkPanel({ editor, close }: { editor: Editor; close: () => void }) {
  const [href, setHref] = useState(String(editor.getAttributes("link").href ?? ""));
  const [error, setError] = useState("");
  function apply() {
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return close();
    }
    const full = /^(https?:|mailto:|tel:)/i.test(value)
      ? value
      : value.includes("@")
        ? `mailto:${value}`
        : `https://${value}`;
    if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d\s]+)$/i.test(full))
      return setError("Bitte eine gültige Adresse eingeben.");
    if (editor.state.selection.empty && !editor.isActive("link"))
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: value, marks: [{ type: "link", attrs: { href: full } }] })
        .run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: full }).run();
    close();
  }
  return (
    <div className="office-form">
      <label>
        <span>Adresse (Webseite oder E-Mail)</span>
        <input
          autoFocus
          value={href}
          placeholder="z. B. www.beispiel.ch"
          onChange={(event) => {
            setHref(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
        />
      </label>
      {error && <p className="office-form-error">{error}</p>}
      <div className="office-form-actions">
        <button type="button" onClick={apply}>
          Übernehmen
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              close();
            }}
          >
            Link entfernen
          </button>
        )}
      </div>
    </div>
  );
}

function TablePicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  return (
    <div className="office-table-picker">
      <div className="office-table-grid" onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 10 }, (_, col) => (
            <button
              key={`${row}-${col}`}
              type="button"
              aria-label={`${row + 1} Zeilen, ${col + 1} Spalten`}
              className={row < hover.rows && col < hover.cols ? "active" : ""}
              onMouseEnter={() => setHover({ rows: row + 1, cols: col + 1 })}
              onFocus={() => setHover({ rows: row + 1, cols: col + 1 })}
              onClick={() => onPick(row + 1, col + 1)}
            />
          )),
        )}
      </div>
      <p>{hover.rows ? `${hover.rows} × ${hover.cols} Tabelle` : "Grösse wählen"}</p>
    </div>
  );
}

function PagePanel({ page, onChange }: { page: PageSetup; onChange: (page: PageSetup) => void }) {
  return (
    <div className="office-form">
      <fieldset>
        <legend>Ausrichtung</legend>
        <div className="office-segmented">
          {(["portrait", "landscape"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={page.orientation === value ? "active" : ""}
              aria-pressed={page.orientation === value}
              onClick={() => onChange({ ...page, orientation: value })}
            >
              {value === "portrait" ? "Hochformat" : "Querformat"}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Seitenränder</legend>
        <div className="office-segmented">
          {(["narrow", "normal", "wide"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={page.margins === value ? "active" : ""}
              aria-pressed={page.margins === value}
              onClick={() => onChange({ ...page, margins: value })}
            >
              {value === "narrow" ? "Schmal" : value === "normal" ? "Normal" : "Breit"}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <span>Kopfzeile</span>
        <input
          value={page.header}
          maxLength={200}
          placeholder="z. B. Name der Einrichtung"
          onChange={(event) => onChange({ ...page, header: event.target.value })}
        />
      </label>
      <label>
        <span>Fusszeile</span>
        <input
          value={page.footer}
          maxLength={200}
          placeholder="z. B. Stand und Verantwortliche"
          onChange={(event) => onChange({ ...page, footer: event.target.value })}
        />
      </label>
      <button
        type="button"
        className={`office-toggle ${page.pageNumbers ? "active" : ""}`}
        aria-pressed={page.pageNumbers}
        onClick={() => onChange({ ...page, pageNumbers: !page.pageNumbers })}
      >
        Seitenzahlen in der Fusszeile („Seite 1 von 3“)
      </button>
    </div>
  );
}

export default function DocEditor({ model, onChange, readOnly, title }: EditorProps<DocumentModel>) {
  const [page, setPage] = useState<PageSetup>({ ...DEFAULT_PAGE, ...model.page });
  const [zoom, setZoom] = useState(100);
  const pageRef = useRef(page);
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const emit = useRef(onChange);
  // Erst nach dem ersten Klick in den Text zählen Änderungen (beim Öffnen gleicht der Editor die Datei nur an).
  const touched = useRef(false);
  useEffect(() => {
    emit.current = onChange;
  }, [onChange]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["mailto", "tel"] },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit.configure({ lineHeight: false }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true }, tableCell: false, tableHeader: false }),
      ShadedCell,
      ShadedHeader,
      Image.configure({ allowBase64: true, resize: { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 40 } }),
      PageBreak,
      CharacterCount,
      Placeholder.configure({ placeholder: "Hier schreiben …" }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: model.content,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "office-prose", "aria-label": `Dokument ${title}`, spellcheck: "true", lang: "de-CH" },
    },
    onFocus: () => {
      touched.current = true;
    },
    onUpdate: ({ editor: current }) => {
      if (!touched.current) return;
      emit.current({ kind: "document", page: pageRef.current, content: current.getJSON() as DocNode });
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  function changePage(next: PageSetup) {
    setPage(next);
    pageRef.current = next;
    if (editor) emit.current({ kind: "document", page: next, content: editor.getJSON() as DocNode });
  }

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const style = current.getAttributes("textStyle");
      return {
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        bullet: current.isActive("bulletList"),
        ordered: current.isActive("orderedList"),
        task: current.isActive("taskList"),
        link: current.isActive("link"),
        table: current.isActive("table"),
        style: current.isActive("heading", { level: 1 })
          ? "h1"
          : current.isActive("heading", { level: 2 })
            ? "h2"
            : current.isActive("heading", { level: 3 })
              ? "h3"
              : current.isActive("blockquote")
                ? "quote"
                : "paragraph",
        align:
          (["center", "right", "justify"] as const).find((value) => current.isActive({ textAlign: value })) ?? "left",
        color: typeof style.color === "string" ? style.color : null,
        font: typeof style.fontFamily === "string" ? style.fontFamily.split(",")[0].replace(/["']/g, "") : "Calibri",
        size: typeof style.fontSize === "string" ? style.fontSize.replace("pt", "") : "11",
        highlight:
          typeof current.getAttributes("highlight").color === "string"
            ? String(current.getAttributes("highlight").color)
            : null,
        canMerge: current.can().mergeCells(),
        canSplit: current.can().splitCell(),
        canSink: current.can().sinkListItem("listItem") || current.can().sinkListItem("taskItem"),
        canLift: current.can().liftListItem("listItem") || current.can().liftListItem("taskItem"),
        words: current.storage.characterCount.words(),
        characters: current.storage.characterCount.characters(),
      };
    },
  });

  if (!editor || !state) return <p className="office-loading">Dokument wird vorbereitet …</p>;

  const chain = () => editor.chain().focus();
  function applyStyle(id: (typeof STYLES)[number]["id"]) {
    if (id === "quote") {
      if (!editor!.isActive("blockquote")) chain().setParagraph().setBlockquote().run();
      return;
    }
    const base = editor!.isActive("blockquote") ? chain().unsetBlockquote() : chain();
    if (id === "paragraph") base.setParagraph().run();
    else base.setHeading({ level: Number(id.slice(1)) as 1 | 2 | 3 }).run();
  }
  async function insertImage(file: File) {
    try {
      setImageError("");
      const src = await imageToDataUrl(file);
      chain()
        .setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") })
        .run();
    } catch (cause) {
      setImageError(cause instanceof Error ? cause.message : "Das Bild konnte nicht eingefügt werden.");
    }
  }
  const sheetWidth = page.orientation === "portrait" ? 210 : 297;
  const sheetHeight = page.orientation === "portrait" ? 297 : 210;
  const margin = MARGINS_MM[page.margins];
  const currentStyle = STYLES.find((item) => item.id === state.style) ?? STYLES[0];

  return (
    <div className="office-doc">
      {!readOnly && (
        <div className="office-ribbon" role="toolbar" aria-label="Formatierung">
          <ToolGroup label="Rückgängig">
            <ToolButton
              label="Rückgängig"
              shortcut="Ctrl+Z"
              icon={<ArrowUUpLeft />}
              disabled={!state.canUndo}
              onClick={() => chain().undo().run()}
            />
            <ToolButton
              label="Wiederholen"
              shortcut="Ctrl+Y"
              icon={<ArrowUUpRight />}
              disabled={!state.canRedo}
              onClick={() => chain().redo().run()}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Formatvorlage">
            <ToolPopover
              label="Formatvorlage"
              className="office-style-picker"
              trigger={<span className="office-select-text">{currentStyle.label}</span>}
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={STYLES.map((item) => ({
                    label: item.label,
                    hint: item.hint,
                    active: state.style === item.id,
                    onSelect: () => applyStyle(item.id),
                  }))}
                />
              )}
            </ToolPopover>
            <ToolPopover
              label="Schriftart"
              className="office-font-picker"
              trigger={<span className="office-select-text">{state.font}</span>}
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={FONTS.map((font) => ({
                    label: font,
                    style: { fontFamily: font },
                    active: state.font === font,
                    onSelect: () =>
                      font === "Calibri" ? chain().unsetFontFamily().run() : chain().setFontFamily(font).run(),
                  }))}
                />
              )}
            </ToolPopover>
            <ToolPopover
              label="Schriftgrösse"
              className="office-size-picker"
              trigger={<span className="office-select-text">{state.size}</span>}
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={SIZES.map((size) => ({
                    label: String(size),
                    active: state.size === String(size),
                    onSelect: () =>
                      size === 11 ? chain().unsetFontSize().run() : chain().setFontSize(`${size}pt`).run(),
                  }))}
                />
              )}
            </ToolPopover>
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Zeichen">
            <ToolButton
              label="Fett"
              shortcut="Ctrl+B"
              icon={<TextB weight="bold" />}
              active={state.bold}
              onClick={() => chain().toggleBold().run()}
            />
            <ToolButton
              label="Kursiv"
              shortcut="Ctrl+I"
              icon={<TextItalic />}
              active={state.italic}
              onClick={() => chain().toggleItalic().run()}
            />
            <ToolButton
              label="Unterstrichen"
              shortcut="Ctrl+U"
              icon={<TextUnderline />}
              active={state.underline}
              onClick={() => chain().toggleUnderline().run()}
            />
            <ToolButton
              label="Durchgestrichen"
              icon={<TextStrikethrough />}
              active={state.strike}
              onClick={() => chain().toggleStrike().run()}
            />
            <ColorPicker
              label="Schriftfarbe"
              icon={<TextAUnderline />}
              current={state.color}
              noneLabel="Automatisch"
              onPick={(color) => (color ? chain().setColor(color).run() : chain().unsetColor().run())}
            />
            <ColorPicker
              label="Hervorheben"
              icon={<HighlighterCircle />}
              current={state.highlight}
              noneLabel="Keine Hervorhebung"
              onPick={(color) => (color ? chain().setHighlight({ color }).run() : chain().unsetHighlight().run())}
            />
            <ToolButton label="Formatierung löschen" icon={<Eraser />} onClick={() => chain().unsetAllMarks().run()} />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Absatz">
            <ToolButton
              label="Linksbündig"
              icon={<TextAlignLeft />}
              active={state.align === "left"}
              onClick={() => chain().setTextAlign("left").run()}
            />
            <ToolButton
              label="Zentriert"
              icon={<TextAlignCenter />}
              active={state.align === "center"}
              onClick={() => chain().setTextAlign("center").run()}
            />
            <ToolButton
              label="Rechtsbündig"
              icon={<TextAlignRight />}
              active={state.align === "right"}
              onClick={() => chain().setTextAlign("right").run()}
            />
            <ToolButton
              label="Blocksatz"
              icon={<TextAlignJustify />}
              active={state.align === "justify"}
              onClick={() => chain().setTextAlign("justify").run()}
            />
            <ToolButton
              label="Aufzählung"
              icon={<ListBullets />}
              active={state.bullet}
              onClick={() => chain().toggleBulletList().run()}
            />
            <ToolButton
              label="Nummerierung"
              icon={<ListNumbers />}
              active={state.ordered}
              onClick={() => chain().toggleOrderedList().run()}
            />
            <ToolButton
              label="Aufgabenliste zum Abhaken"
              icon={<ListChecks />}
              active={state.task}
              onClick={() => chain().toggleTaskList().run()}
            />
            <ToolButton
              label="Einzug verkleinern"
              icon={<TextOutdent />}
              disabled={!state.canLift}
              onClick={() =>
                editor.can().liftListItem("taskItem")
                  ? chain().liftListItem("taskItem").run()
                  : chain().liftListItem("listItem").run()
              }
            />
            <ToolButton
              label="Einzug vergrössern"
              icon={<TextIndent />}
              disabled={!state.canSink}
              onClick={() =>
                editor.can().sinkListItem("taskItem")
                  ? chain().sinkListItem("taskItem").run()
                  : chain().sinkListItem("listItem").run()
              }
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Einfügen">
            <ToolPopover label="Tabelle einfügen" trigger={<Table />}>
              {(close) => (
                <TablePicker
                  onPick={(rows, cols) => {
                    close();
                    chain().insertTable({ rows, cols, withHeaderRow: true }).run();
                  }}
                />
              )}
            </ToolPopover>
            <ToolButton label="Bild einfügen" icon={<ImageIcon />} onClick={() => imageInput.current?.click()} />
            <ToolPopover label="Link" trigger={<LinkSimple />} className={state.link ? "active" : ""}>
              {(close) => <LinkPanel editor={editor} close={close} />}
            </ToolPopover>
            <ToolButton label="Trennlinie" icon={<Minus />} onClick={() => chain().setHorizontalRule().run()} />
            <ToolButton
              label="Seitenumbruch"
              shortcut="Ctrl+Enter"
              icon={<FileDashed />}
              onClick={() => chain().insertContent({ type: "pageBreak" }).run()}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Dokument">
            <ToolPopover label="Suchen und ersetzen" trigger={<MagnifyingGlass />} wide>
              {(close) => <FindPanel editor={editor} close={close} />}
            </ToolPopover>
            <ToolPopover label="Seite einrichten" trigger={<GearSix />} wide>
              {() => <PagePanel page={page} onChange={changePage} />}
            </ToolPopover>
          </ToolGroup>
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void insertImage(file);
            }}
          />
        </div>
      )}
      {!readOnly && state.table && (
        <div className="office-contextbar" role="toolbar" aria-label="Tabelle">
          <span className="office-contextbar-label">Tabelle</span>
          <ToolButton
            label="Zeile oberhalb einfügen"
            icon={<RowsPlusTop />}
            text="Zeile oben"
            onClick={() => chain().addRowBefore().run()}
          />
          <ToolButton
            label="Zeile unterhalb einfügen"
            icon={<RowsPlusBottom />}
            text="Zeile unten"
            onClick={() => chain().addRowAfter().run()}
          />
          <ToolButton
            label="Spalte links einfügen"
            icon={<ColumnsPlusLeft />}
            text="Spalte links"
            onClick={() => chain().addColumnBefore().run()}
          />
          <ToolButton
            label="Spalte rechts einfügen"
            icon={<ColumnsPlusRight />}
            text="Spalte rechts"
            onClick={() => chain().addColumnAfter().run()}
          />
          <ToolSeparator />
          <ToolButton
            label="Zellen verbinden"
            icon={<ArrowsMerge />}
            text="Verbinden"
            disabled={!state.canMerge}
            onClick={() => chain().mergeCells().run()}
          />
          <ToolButton
            label="Zelle teilen"
            icon={<ArrowsSplit />}
            text="Teilen"
            disabled={!state.canSplit}
            onClick={() => chain().splitCell().run()}
          />
          <ToolButton label="Kopfzeile ein oder aus" text="Kopfzeile" onClick={() => chain().toggleHeaderRow().run()} />
          <ColorPicker
            label="Zellfarbe"
            icon={<PaintBucket />}
            current={null}
            noneLabel="Keine Füllung"
            onPick={(color) => chain().setCellAttribute("backgroundColor", color).run()}
          />
          <ToolSeparator />
          <ToolButton label="Zeile löschen" text="Zeile löschen" onClick={() => chain().deleteRow().run()} />
          <ToolButton label="Spalte löschen" text="Spalte löschen" onClick={() => chain().deleteColumn().run()} />
          <ToolButton
            label="Tabelle löschen"
            icon={<Trash />}
            className="danger"
            onClick={() => chain().deleteTable().run()}
          />
        </div>
      )}
      {imageError && (
        <p className="office-inline-error" role="alert">
          {imageError}
        </p>
      )}
      <div className="office-canvas">
        <div
          className="office-page"
          style={{
            width: `${sheetWidth}mm`,
            minHeight: `${sheetHeight}mm`,
            padding: `${margin}mm`,
            zoom: zoom / 100,
          }}
        >
          {page.header && (
            <div
              className="office-page-header"
              style={{ top: `${Math.min(12, margin / 2)}mm`, left: `${margin}mm`, right: `${margin}mm` }}
            >
              {page.header}
            </div>
          )}
          <EditorContent editor={editor} />
          {(page.footer || page.pageNumbers) && (
            <div
              className="office-page-footer"
              style={{ bottom: `${Math.min(10, margin / 2)}mm`, left: `${margin}mm`, right: `${margin}mm` }}
            >
              {page.footer}
              {page.footer && page.pageNumbers ? "   ·   " : ""}
              {page.pageNumbers ? "Seite 1 von …" : ""}
            </div>
          )}
        </div>
      </div>
      <footer className="office-statusbar">
        <span>
          {state.words.toLocaleString("de-CH")} {state.words === 1 ? "Wort" : "Wörter"} ·{" "}
          {state.characters.toLocaleString("de-CH")} Zeichen
        </span>
        <span className="office-zoom" role="group" aria-label="Zoom">
          {ZOOMS.map((value) => (
            <button
              key={value}
              type="button"
              className={zoom === value ? "active" : ""}
              aria-pressed={zoom === value}
              onClick={() => setZoom(value)}
            >
              {value}%
            </button>
          ))}
        </span>
      </footer>
      <style>{`@media print { @page { size: A4 ${page.orientation}; margin: ${margin}mm; } }`}</style>
    </div>
  );
}
