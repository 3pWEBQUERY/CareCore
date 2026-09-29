// Messenger: Reaktionen und @Erwähnungen, gemeinsam für API und Oberfläche.

// Feste Auswahl, damit Reaktionen kurz und einheitlich bleiben.
export const MESSAGE_REACTIONS = ["👍", "❤️", "✅", "👀", "🙏"] as const;
export type MessageReaction = (typeof MESSAGE_REACTIONS)[number];

export type ReactionSummary = { emoji: MessageReaction; count: number; mine: boolean; names: string[] };

// Erwähnte Mitglieder: „@Vorname Nachname“ im Text. Längere Namen zuerst, damit „@Anna Müller-Meier“ nicht als
// „@Anna Müller“ gilt; Gross-/Kleinschreibung spielt keine Rolle.
export function mentionedMembers<T extends { user_id: string; display_name: string }>(text: string, members: T[]) {
  const lower = text.toLocaleLowerCase("de-CH");
  const found = new Set<string>();
  const sorted = [...members].sort((a, b) => b.display_name.length - a.display_name.length);
  let rest = lower;
  for (const member of sorted) {
    const needle = `@${member.display_name.toLocaleLowerCase("de-CH")}`;
    let index = rest.indexOf(needle);
    while (index >= 0) {
      const after = rest[index + needle.length];
      if (after === undefined || !/[\p{L}\p{N}-]/u.test(after)) {
        found.add(member.user_id);
        rest = `${rest.slice(0, index)}${" ".repeat(needle.length)}${rest.slice(index + needle.length)}`;
      }
      index = rest.indexOf(needle, index + 1);
    }
  }
  return [...found];
}
