// Gemeinsame Schnittstelle der drei Editoren (Dokument, Tabelle, Präsentation).
export type EditorProps<T> = {
  model: T;
  onChange: (model: T) => void;
  readOnly: boolean;
  title: string;
  // Vom Editor gesetzt: übernimmt eine noch offene Eingabe (vor Speichern, Herunterladen, Schliessen).
  flushRef?: { current: (() => boolean) | null };
};
