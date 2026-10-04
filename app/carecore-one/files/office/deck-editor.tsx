"use client";

import NextImage from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import {
  ArrowDown,
  ArrowUp,
  ArrowUUpLeft,
  ArrowUUpRight,
  CopySimple,
  HighlighterCircle,
  Image as ImageIcon,
  Layout,
  ListBullets,
  ListNumbers,
  Palette,
  Play,
  Plus,
  TextAUnderline,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextIndent,
  TextItalic,
  TextOutdent,
  TextStrikethrough,
  TextUnderline,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  DECK_THEMES,
  SLIDE_BODY_SIZE,
  SLIDE_BOXES,
  SLIDE_LAYOUTS,
  SLIDE_SIZE,
  emptyDoc,
  newId,
  newSlide,
  type DeckModel,
  type DeckTheme,
  type DocMark,
  type DocNode,
  type Slide,
  type SlideBox,
  type SlideLayout,
} from "@/lib/office/model";
import type { EditorProps } from "./editor-props";
import { alignText, toggleList } from "./text-commands";
import { ColorPicker, MenuList, ToolButton, ToolGroup, ToolPopover, ToolSeparator, imageToDataUrl } from "./office-ui";

// Masse in Prozent der Folie, Schriftgrössen relativ zur Folienbreite (Folie 960 pt breit wie in PowerPoint).
const box = (value: SlideBox): CSSProperties => ({
  left: `${(value.x / SLIDE_SIZE.width) * 100}%`,
  top: `${(value.y / SLIDE_SIZE.height) * 100}%`,
  width: `${(value.w / SLIDE_SIZE.width) * 100}%`,
  height: `${(value.h / SLIDE_SIZE.height) * 100}%`,
});
const pt = (size: number) => `${size / 9.6}cqw`;

function slideColors(slide: Slide, theme: DeckTheme) {
  const colors = DECK_THEMES[theme];
  return slide.layout === "section"
    ? { background: colors.accent, text: "#ffffff", accent: "#ffffff", muted: "rgba(255,255,255,0.86)" }
    : { background: colors.background, text: colors.text, accent: colors.accent, muted: colors.muted };
}

// ---------- Anzeige ohne Bearbeitung (Übersicht, Vorführen, Drucken) ----------

function markStyle(marks: DocMark[] | undefined): CSSProperties {
  const style: CSSProperties = {};
  for (const mark of marks ?? []) {
    if (mark.type === "bold") style.fontWeight = 700;
    if (mark.type === "italic") style.fontStyle = "italic";
    if (mark.type === "underline") style.textDecoration = `${style.textDecoration ?? ""} underline`.trim();
    if (mark.type === "strike") style.textDecoration = `${style.textDecoration ?? ""} line-through`.trim();
    if (mark.type === "textStyle" && typeof mark.attrs?.color === "string") style.color = mark.attrs.color;
    if (mark.type === "highlight")
      style.background = typeof mark.attrs?.color === "string" ? mark.attrs.color : "#fef08a";
  }
  return style;
}

function DocView({ node }: { node: DocNode }): ReactNode {
  const children = (node.content ?? []).map((child, index) => <DocView key={index} node={child} />);
  const align = node.attrs?.textAlign ? { textAlign: node.attrs.textAlign as CSSProperties["textAlign"] } : undefined;
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return <p style={align}>{children.length ? children : <br />}</p>;
    case "heading":
      return <h3 style={align}>{children}</h3>;
    case "bulletList":
      return <ul>{children}</ul>;
    case "orderedList":
      return <ol start={Number(node.attrs?.start ?? 1)}>{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "hardBreak":
      return <br />;
    case "text":
      return node.marks?.length ? <span style={markStyle(node.marks)}>{node.text}</span> : <>{node.text}</>;
    default:
      return <>{children}</>;
  }
}

function SlideView({
  slide,
  theme,
  className,
  children,
}: {
  slide: Slide;
  theme: DeckTheme;
  className?: string;
  children?: ReactNode;
}) {
  const colors = slideColors(slide, theme);
  const boxes = SLIDE_BOXES[slide.layout];
  return (
    <div
      className={`deck-slide layout-${slide.layout} ${className ?? ""}`}
      style={{
        background: colors.background,
        color: colors.text,
        ["--deck-accent" as string]: colors.accent,
        ["--deck-muted" as string]: colors.muted,
      }}
    >
      {children ?? (
        <>
          <div
            className={`deck-box deck-title anchor-${boxes.anchor}`}
            style={{ ...box(boxes.title), fontSize: pt(boxes.titleSize) }}
          >
            <span>{slide.title}</span>
          </div>
          {boxes.bar && <div className="deck-bar" style={{ ...box(boxes.bar), background: colors.accent }} />}
          {boxes.subtitle && (
            <div className="deck-box deck-subtitle" style={{ ...box(boxes.subtitle), fontSize: pt(20) }}>
              {slide.subtitle}
            </div>
          )}
          {boxes.body && (
            <div className="deck-box deck-body" style={{ ...box(boxes.body), fontSize: pt(SLIDE_BODY_SIZE) }}>
              <DocView node={slide.body} />
            </div>
          )}
          {boxes.body2 && (
            <div className="deck-box deck-body" style={{ ...box(boxes.body2), fontSize: pt(SLIDE_BODY_SIZE) }}>
              <DocView node={slide.body2} />
            </div>
          )}
          {boxes.image && slide.image && (
            <div className="deck-box deck-image" style={box(boxes.image)}>
              <NextImage src={slide.image} alt="" fill unoptimized sizes="50vw" style={{ objectFit: "contain" }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Bearbeiten ----------

function BodyEditor({
  value,
  placeholder,
  readOnly,
  onChange,
  onFocus,
}: {
  value: DocNode;
  placeholder: string;
  readOnly: boolean;
  onChange: (node: DocNode) => void;
  onFocus: (editor: Editor) => void;
}) {
  const emit = useRef(onChange);
  const focus = useRef(onFocus);
  useEffect(() => {
    emit.current = onChange;
    focus.current = onFocus;
  }, [onChange, onFocus]);
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [3] },
        horizontalRule: false,
        link: false,
        blockquote: false,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit.configure({ fontFamily: false, fontSize: false, lineHeight: false, backgroundColor: false }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder],
  );
  const editorProps = useMemo(
    () => ({ attributes: { class: "deck-prose", "aria-label": placeholder } }),
    [placeholder],
  );
  const editor = useEditor({
    extensions,
    content: value,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps,
    onUpdate: ({ editor: current }) => emit.current(current.getJSON() as DocNode),
    onFocus: ({ editor: current }) => focus.current(current),
  });
  return <EditorContent editor={editor} />;
}

function AutoText({
  value,
  placeholder,
  readOnly,
  className,
  style,
  onChange,
}: {
  value: string;
  placeholder: string;
  readOnly: boolean;
  className: string;
  style: CSSProperties;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      className={className}
      style={style}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-label={placeholder}
      rows={1}
      spellCheck
      onChange={(event) => onChange(event.target.value.replace(/\n/g, " "))}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault();
      }}
    />
  );
}

function Presenter({
  slides,
  theme,
  start,
  onExit,
}: {
  slides: Slide[];
  theme: DeckTheme;
  start: number;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(start);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    element?.focus();
    void element?.requestFullscreen?.().catch(() => undefined);
    const onFullscreen = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [onExit]);
  const go = (delta: number) => setIndex((current) => Math.max(0, Math.min(slides.length - 1, current + delta)));
  return createPortal(
    <div
      ref={root}
      className="deck-presenter"
      tabIndex={-1}
      role="dialog"
      aria-label="Vorführen"
      onClick={() => go(1)}
      onKeyDown={(event) => {
        if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
          event.preventDefault();
          go(1);
        } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(event.key)) {
          event.preventDefault();
          go(-1);
        } else if (event.key === "Home") setIndex(0);
        else if (event.key === "End") setIndex(slides.length - 1);
        else if (event.key === "Escape") onExit();
      }}
    >
      <div className="deck-presenter-stage">
        <SlideView slide={slides[index]} theme={theme} />
      </div>
      <div className="deck-presenter-bar" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Vorherige Folie">
          <ArrowUp aria-hidden="true" style={{ transform: "rotate(-90deg)" }} />
        </button>
        <span>
          {index + 1} / {slides.length}
        </span>
        <button type="button" onClick={() => go(1)} disabled={index === slides.length - 1} aria-label="Nächste Folie">
          <ArrowDown aria-hidden="true" style={{ transform: "rotate(-90deg)" }} />
        </button>
        <button type="button" onClick={onExit} aria-label="Vorführen beenden">
          <X aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default function DeckEditor({ model: initial, onChange, readOnly }: EditorProps<DeckModel>) {
  const [model, setModel] = useState(initial);
  const modelRef = useRef(initial);
  const [current, setCurrent] = useState(0);
  const [focused, setFocused] = useState<Editor | null>(null);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const [undo, setUndo] = useState<{ text: string; model: DeckModel } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const emit = useRef(onChange);
  useEffect(() => {
    emit.current = onChange;
  }, [onChange]);

  const update = useCallback((next: DeckModel) => {
    modelRef.current = next;
    setModel(next);
    emit.current(next);
  }, []);
  const updateSlide = useCallback(
    (id: string, change: (slide: Slide) => Slide) => {
      const now = modelRef.current;
      update({ ...now, slides: now.slides.map((slide) => (slide.id === id ? change(slide) : slide)) });
    },
    [update],
  );

  useEffect(() => {
    if (!undo) return;
    const id = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(id);
  }, [undo]);
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

  const index = Math.min(current, model.slides.length - 1);
  const slide = model.slides[index];
  const boxes = SLIDE_BOXES[slide.layout];
  const colors = slideColors(slide, model.theme);

  const state = useEditorState({
    editor: focused,
    selector: ({ editor }) =>
      editor && !editor.isDestroyed
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            align: (["center", "right"] as const).find((value) => editor.isActive({ textAlign: value })) ?? "left",
            color:
              typeof editor.getAttributes("textStyle").color === "string"
                ? String(editor.getAttributes("textStyle").color)
                : null,
            highlight:
              typeof editor.getAttributes("highlight").color === "string"
                ? String(editor.getAttributes("highlight").color)
                : null,
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
            canSink: editor.can().sinkListItem("listItem"),
            canLift: editor.can().liftListItem("listItem"),
          }
        : null,
  });
  const text = focused && !focused.isDestroyed ? () => focused.chain().focus() : null;

  function addSlide(layout: SlideLayout) {
    const now = modelRef.current;
    const slides = [...now.slides];
    slides.splice(index + 1, 0, newSlide(layout));
    update({ ...now, slides });
    setCurrent(index + 1);
    setFocused(null);
  }
  function duplicate(at: number) {
    const now = modelRef.current;
    const slides = [...now.slides];
    slides.splice(at + 1, 0, { ...structuredClone(now.slides[at]), id: newId() });
    update({ ...now, slides });
    setCurrent(at + 1);
  }
  function remove(at: number) {
    const now = modelRef.current;
    if (now.slides.length < 2) return;
    setUndo({ text: `Folie ${at + 1} gelöscht`, model: now });
    update({ ...now, slides: now.slides.filter((_, position) => position !== at) });
    setCurrent(Math.max(0, Math.min(at, now.slides.length - 2)));
    setFocused(null);
  }
  function moveSlide(from: number, to: number) {
    const now = modelRef.current;
    if (to < 0 || to >= now.slides.length || from === to) return;
    const slides = [...now.slides];
    const [moved] = slides.splice(from, 1);
    slides.splice(to, 0, moved);
    update({ ...now, slides });
    setCurrent(to);
  }
  async function pickImage(file: File) {
    try {
      setError("");
      const src = await imageToDataUrl(file, 1920);
      updateSlide(slide.id, (item) => ({
        ...item,
        image: src,
        layout: SLIDE_BOXES[item.layout].image ? item.layout : "image",
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Das Bild konnte nicht eingefügt werden.");
    }
  }

  const layoutLabel = SLIDE_LAYOUTS.find((item) => item.value === slide.layout)?.label ?? "";

  return (
    <div className="office-deck">
      {!readOnly && (
        <div className="office-ribbon" role="toolbar" aria-label="Präsentation bearbeiten">
          <ToolGroup label="Rückgängig">
            <ToolButton
              label="Rückgängig"
              shortcut="Ctrl+Z"
              icon={<ArrowUUpLeft />}
              disabled={!state?.canUndo}
              onClick={() => text?.().undo().run()}
            />
            <ToolButton
              label="Wiederholen"
              shortcut="Ctrl+Y"
              icon={<ArrowUUpRight />}
              disabled={!state?.canRedo}
              onClick={() => text?.().redo().run()}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Folien">
            <ToolPopover
              label="Neue Folie"
              trigger={
                <span className="office-tool-label">
                  <Plus aria-hidden="true" /> Neue Folie
                </span>
              }
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={SLIDE_LAYOUTS.map((item) => ({ label: item.label, onSelect: () => addSlide(item.value) }))}
                />
              )}
            </ToolPopover>
            <ToolPopover
              label="Layout"
              trigger={
                <span className="office-tool-label">
                  <Layout aria-hidden="true" /> {layoutLabel}
                </span>
              }
            >
              {(close) => (
                <MenuList
                  close={close}
                  items={SLIDE_LAYOUTS.map((item) => ({
                    label: item.label,
                    active: slide.layout === item.value,
                    onSelect: () => {
                      setFocused(null);
                      updateSlide(slide.id, (current) => ({ ...current, layout: item.value }));
                    },
                  }))}
                />
              )}
            </ToolPopover>
            <ToolPopover
              label="Design"
              trigger={
                <span className="office-tool-label">
                  <Palette aria-hidden="true" /> Design
                </span>
              }
            >
              {(close) => (
                <div className="deck-themes">
                  {(Object.keys(DECK_THEMES) as DeckTheme[]).map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className={model.theme === theme ? "active" : ""}
                      aria-pressed={model.theme === theme}
                      onClick={() => {
                        update({ ...modelRef.current, theme });
                        close();
                      }}
                    >
                      <span
                        className="deck-theme-swatch"
                        style={{ background: DECK_THEMES[theme].background, color: DECK_THEMES[theme].text }}
                      >
                        <i style={{ background: DECK_THEMES[theme].accent }} />
                        Aa
                      </span>
                      {DECK_THEMES[theme].label}
                    </button>
                  ))}
                </div>
              )}
            </ToolPopover>
            <ToolButton label="Folie duplizieren" icon={<CopySimple />} onClick={() => duplicate(index)} />
            <ToolButton
              label="Folie löschen"
              icon={<Trash />}
              className="danger"
              disabled={model.slides.length < 2}
              onClick={() => remove(index)}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Text">
            <ToolButton
              label="Fett"
              shortcut="Ctrl+B"
              icon={<TextB weight="bold" />}
              disabled={!text}
              active={state?.bold}
              onClick={() => text?.().toggleBold().run()}
            />
            <ToolButton
              label="Kursiv"
              shortcut="Ctrl+I"
              icon={<TextItalic />}
              disabled={!text}
              active={state?.italic}
              onClick={() => text?.().toggleItalic().run()}
            />
            <ToolButton
              label="Unterstrichen"
              shortcut="Ctrl+U"
              icon={<TextUnderline />}
              disabled={!text}
              active={state?.underline}
              onClick={() => text?.().toggleUnderline().run()}
            />
            <ToolButton
              label="Durchgestrichen"
              icon={<TextStrikethrough />}
              disabled={!text}
              active={state?.strike}
              onClick={() => text?.().toggleStrike().run()}
            />
            <ColorPicker
              label="Schriftfarbe"
              icon={<TextAUnderline />}
              current={state?.color ?? null}
              noneLabel="Automatisch"
              onPick={(color) => (color ? text?.().setColor(color).run() : text?.().unsetColor().run())}
            />
            <ColorPicker
              label="Hervorheben"
              icon={<HighlighterCircle />}
              current={state?.highlight ?? null}
              noneLabel="Keine Hervorhebung"
              onPick={(color) => (color ? text?.().setHighlight({ color }).run() : text?.().unsetHighlight().run())}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Absatz">
            <ToolButton
              label="Aufzählung"
              icon={<ListBullets />}
              disabled={!text}
              active={state?.bullet}
              onClick={() => focused && toggleList(focused, "bulletList", "listItem")}
            />
            <ToolButton
              label="Nummerierung"
              icon={<ListNumbers />}
              disabled={!text}
              active={state?.ordered}
              onClick={() => focused && toggleList(focused, "orderedList", "listItem")}
            />
            <ToolButton
              label="Einzug verkleinern"
              icon={<TextOutdent />}
              disabled={!state?.canLift}
              onClick={() => text?.().liftListItem("listItem").run()}
            />
            <ToolButton
              label="Einzug vergrössern"
              icon={<TextIndent />}
              disabled={!state?.canSink}
              onClick={() => text?.().sinkListItem("listItem").run()}
            />
            <ToolButton
              label="Linksbündig"
              icon={<TextAlignLeft />}
              disabled={!text}
              active={state?.align === "left"}
              onClick={() => focused && alignText(focused, "left")}
            />
            <ToolButton
              label="Zentriert"
              icon={<TextAlignCenter />}
              disabled={!text}
              active={state?.align === "center"}
              onClick={() => text?.().setTextAlign("center").run()}
            />
            <ToolButton
              label="Rechtsbündig"
              icon={<TextAlignRight />}
              disabled={!text}
              active={state?.align === "right"}
              onClick={() => text?.().setTextAlign("right").run()}
            />
          </ToolGroup>
          <ToolSeparator />
          <ToolGroup label="Einfügen">
            <ToolButton
              label={slide.image ? "Bild ersetzen" : "Bild einfügen"}
              icon={<ImageIcon />}
              text={slide.image ? "Bild ersetzen" : "Bild"}
              onClick={() => imageInput.current?.click()}
            />
            {slide.image && SLIDE_BOXES[slide.layout].image && (
              <ToolButton
                label="Bild entfernen"
                icon={<Trash />}
                onClick={() => updateSlide(slide.id, (item) => ({ ...item, image: "" }))}
              />
            )}
          </ToolGroup>
          <ToolSeparator />
          <ToolButton
            label="Ab aktueller Folie vorführen"
            icon={<Play weight="fill" />}
            text="Vorführen"
            className="primary"
            onClick={() => setPresenting(index)}
          />
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void pickImage(file);
            }}
          />
        </div>
      )}
      {readOnly && (
        <div className="office-ribbon" role="toolbar" aria-label="Präsentation">
          <ToolButton
            label="Vorführen"
            icon={<Play weight="fill" />}
            text="Vorführen"
            className="primary"
            onClick={() => setPresenting(0)}
          />
        </div>
      )}
      {error && (
        <p className="office-inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="deck-workspace">
        <ol
          className="deck-rail"
          aria-label="Folien"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCurrent(Math.min(model.slides.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCurrent(Math.max(0, index - 1));
            } else if ((event.key === "Delete" || event.key === "Backspace") && !readOnly) {
              event.preventDefault();
              remove(index);
            }
          }}
        >
          {model.slides.map((item, position) => (
            <Fragment key={item.id}>
              {dropIndex === position && dragIndex !== null && dragIndex !== position && (
                <li className="deck-drop-line" aria-hidden="true" />
              )}
              <li
                className={`deck-thumb ${position === index ? "active" : ""} ${dragIndex === position ? "dragging" : ""}`}
                draggable={!readOnly}
                onDragStart={(event) => {
                  setDragIndex(position);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(position));
                }}
                onDragOver={(event) => {
                  if (dragIndex === null) return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDropIndex(event.clientY > rect.top + rect.height / 2 ? position + 1 : position);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null && dropIndex !== null)
                    moveSlide(dragIndex, dropIndex > dragIndex ? dropIndex - 1 : dropIndex);
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
              >
                <span className="deck-thumb-number">{position + 1}</span>
                <button
                  type="button"
                  className="deck-thumb-button"
                  aria-label={`Folie ${position + 1}${item.title ? `: ${item.title}` : ""}`}
                  aria-current={position === index}
                  onClick={() => {
                    setCurrent(position);
                    setFocused(null);
                  }}
                >
                  <SlideView slide={item} theme={model.theme} className="thumb" />
                </button>
                {!readOnly && position === index && (
                  <span className="deck-thumb-actions">
                    <button
                      type="button"
                      aria-label="Folie nach oben"
                      data-tip="Folie nach oben"
                      disabled={position === 0}
                      onClick={() => moveSlide(position, position - 1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Folie nach unten"
                      data-tip="Folie nach unten"
                      disabled={position === model.slides.length - 1}
                      onClick={() => moveSlide(position, position + 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </button>
                  </span>
                )}
              </li>
            </Fragment>
          ))}
          {dropIndex === model.slides.length && dragIndex !== null && (
            <li className="deck-drop-line" aria-hidden="true" />
          )}
          {!readOnly && (
            <li className="deck-add">
              <button type="button" onClick={() => addSlide("content")}>
                <Plus aria-hidden="true" /> Folie
              </button>
            </li>
          )}
        </ol>
        <div className="deck-stage-wrap">
          <div className="deck-stage">
            <SlideView slide={slide} theme={model.theme} className="editing">
              <div
                className={`deck-box deck-title anchor-${boxes.anchor}`}
                style={{ ...box(boxes.title), fontSize: pt(boxes.titleSize) }}
              >
                <AutoText
                  key={`${slide.id}-title`}
                  className="deck-input title"
                  style={{ color: colors.text }}
                  value={slide.title}
                  placeholder={slide.layout === "title" ? "Titel der Präsentation" : "Titel eingeben"}
                  readOnly={readOnly}
                  onChange={(value) => updateSlide(slide.id, (item) => ({ ...item, title: value }))}
                />
              </div>
              {boxes.bar && <div className="deck-bar" style={{ ...box(boxes.bar), background: colors.accent }} />}
              {boxes.subtitle && (
                <div className="deck-box deck-subtitle" style={{ ...box(boxes.subtitle), fontSize: pt(20) }}>
                  <AutoText
                    key={`${slide.id}-subtitle`}
                    className="deck-input subtitle"
                    style={{ color: colors.muted }}
                    value={slide.subtitle}
                    placeholder="Untertitel eingeben"
                    readOnly={readOnly}
                    onChange={(value) => updateSlide(slide.id, (item) => ({ ...item, subtitle: value }))}
                  />
                </div>
              )}
              {boxes.body && (
                <div
                  className="deck-box deck-body editable"
                  style={{ ...box(boxes.body), fontSize: pt(SLIDE_BODY_SIZE) }}
                >
                  <BodyEditor
                    key={`${slide.id}-body`}
                    value={slide.body.content?.length ? slide.body : emptyDoc()}
                    placeholder="Text eingeben"
                    readOnly={readOnly}
                    onFocus={setFocused}
                    onChange={(node) => updateSlide(slide.id, (item) => ({ ...item, body: node }))}
                  />
                </div>
              )}
              {boxes.body2 && (
                <div
                  className="deck-box deck-body editable"
                  style={{ ...box(boxes.body2), fontSize: pt(SLIDE_BODY_SIZE) }}
                >
                  <BodyEditor
                    key={`${slide.id}-body2`}
                    value={slide.body2.content?.length ? slide.body2 : emptyDoc()}
                    placeholder="Text eingeben"
                    readOnly={readOnly}
                    onFocus={setFocused}
                    onChange={(node) => updateSlide(slide.id, (item) => ({ ...item, body2: node }))}
                  />
                </div>
              )}
              {boxes.image && (
                <div className="deck-box deck-image" style={box(boxes.image)}>
                  {slide.image ? (
                    <NextImage
                      src={slide.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="50vw"
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    !readOnly && (
                      <button type="button" className="deck-image-empty" onClick={() => imageInput.current?.click()}>
                        <ImageIcon aria-hidden="true" />
                        Bild einfügen
                      </button>
                    )
                  )}
                </div>
              )}
            </SlideView>
          </div>
          <label className="deck-notes">
            <span>Notizen für die Vortragenden</span>
            <textarea
              key={`${slide.id}-notes`}
              value={slide.notes}
              readOnly={readOnly}
              placeholder="Was zu dieser Folie gesagt werden soll …"
              onChange={(event) => updateSlide(slide.id, (item) => ({ ...item, notes: event.target.value }))}
            />
          </label>
        </div>
      </div>
      <footer className="office-statusbar">
        <span>
          Folie {index + 1} von {model.slides.length} · {DECK_THEMES[model.theme].label}
        </span>
        {undo && (
          <span className="office-undo" role="status">
            {undo.text}
            <button
              type="button"
              onClick={() => {
                update(undo.model);
                setUndo(null);
              }}
            >
              Rückgängig
            </button>
          </span>
        )}
      </footer>
      {presenting !== null && (
        <Presenter slides={model.slides} theme={model.theme} start={presenting} onExit={() => setPresenting(null)} />
      )}
      {printing && (
        <div className="office-print-only deck-print">
          {model.slides.map((item) => (
            <SlideView key={item.id} slide={item} theme={model.theme} />
          ))}
          <style>{"@media print { @page { size: A4 landscape; margin: 0; } }"}</style>
        </div>
      )}
    </div>
  );
}
