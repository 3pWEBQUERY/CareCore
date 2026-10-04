import { crc32, deflateRawSync } from "node:zlib";

// ZIP-Archiv (PKZIP, Deflate) für den Download mehrerer Dateien oder ganzer Ordner aus der Ablage.
// Dateinamen in UTF-8 (Bit 11), Pfade mit „/“; Zeitstempel im DOS-Format (lokale Zeit genügt für Downloads).
export type ZipEntry = { path: string; content: Buffer; modified?: Date };

function dosTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

export function createZip(entries: ZipEntry[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.path.replace(/^\/+/, ""), "utf8");
    const packed = deflateRawSync(entry.content);
    // Kleine oder bereits komprimierte Dateien (Bilder, PDF) werden durch Deflate nicht kleiner: dann unverändert.
    const stored = packed.length >= entry.content.length;
    const data = stored ? entry.content : packed;
    const checksum = crc32(entry.content) >>> 0;
    const { time, day } = dosTime(entry.modified ?? new Date());
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(entry.content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

// Eindeutige Pfade im Archiv: gleiche Namen im selben Ordner erhalten „ (2)“, „ (3)“ … vor der Endung.
export function uniquePath(path: string, taken: Set<string>) {
  let candidate = path;
  for (let index = 2; taken.has(candidate.toLowerCase()); index += 1) {
    const dot = path.lastIndexOf(".");
    const slash = path.lastIndexOf("/");
    candidate = dot > slash + 1 ? `${path.slice(0, dot)} (${index})${path.slice(dot)}` : `${path} (${index})`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
