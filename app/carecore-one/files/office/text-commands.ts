import type { Editor } from "@tiptap/react";

// Liste ein- oder ausschalten wie in Word: Liegt jeder beschriebene Absatz der Markierung schon in dieser Liste,
// wird sie aufgehoben (auch nach „Alles markieren“, das den leeren Schlussabsatz mit erfasst); sonst wird sie gesetzt.
export function toggleList(
  editor: Editor,
  list: "bulletList" | "orderedList" | "taskList",
  item: "listItem" | "taskItem",
) {
  const { from, to } = editor.state.selection;
  let total = 0;
  let inside = 0;
  let depth = 0;
  let first = -1;
  let last = -1;
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    const resolved = editor.state.doc.resolve(pos + 1);
    let levels = 0;
    let inAnyList = false;
    for (let level = resolved.depth; level > 0; level -= 1) {
      const name = resolved.node(level).type.name;
      if (name === list) levels += 1;
      if (name === "bulletList" || name === "orderedList" || name === "taskList") inAnyList = true;
    }
    // Leere Absätze ausserhalb von Listen (z. B. der Schlussabsatz nach „Alles markieren“) zählen nicht mit.
    if (node.content.size === 0 && !inAnyList) return false;
    total += 1;
    if (first < 0) first = pos + 1;
    last = pos + 1 + node.content.size;
    if (levels) inside += 1;
    depth = Math.max(depth, levels);
    return false;
  });
  if (!total) return;
  // Ein Schritt (ein „Rückgängig“): Markierung auf die betroffenen Absätze begrenzen.
  let chain = editor.chain().focus().setTextSelection({ from: first, to: last });
  if (inside === total) for (let level = 0; level < depth; level += 1) chain = chain.liftListItem(item);
  else if (list === "bulletList") chain = chain.toggleBulletList();
  else if (list === "orderedList") chain = chain.toggleOrderedList();
  else chain = chain.toggleTaskList();
  chain.run();
}

// Linksbündig ist die Grundausrichtung: Ausrichtung entfernen statt „links“ zu speichern.
export function alignText(editor: Editor, align: "left" | "center" | "right" | "justify") {
  if (align === "left") editor.chain().focus().unsetTextAlign().run();
  else editor.chain().focus().setTextAlign(align).run();
}
