// Who may open a stored file (see lib/file-access.ts); kept free of I/O so it can be tested.
export type StoredFileOwner = {
  purpose: string;
  uploadedBy: string | null;
  documentId: string | null;
  certificateUserId: string | null;
};

export function mayReadFile(file: StoredFileOwner, actor: { id: string; permissions: string[] }) {
  const own = file.uploadedBy === actor.id;
  if (file.purpose === "cloud") return own;
  if (file.purpose === "certificate")
    return own || file.certificateUserId === actor.id || actor.permissions.includes("team.manage");
  if (file.purpose === "document" && file.documentId) return actor.permissions.includes("residents.read");
  return own;
}
