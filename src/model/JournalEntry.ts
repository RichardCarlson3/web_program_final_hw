export type JournalStatus = "active" | "completed";

export interface IJournalEntry {
  id: number;
  title: string;
  body: string;
  tag: string;
  status: JournalStatus;
  // Compatibility alias retained from 6.9 while the route shape evolves.
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJournalEntryData {
  title: string;
  body: string;
  tag?: string;
  status?: JournalStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

function normalizeTitle(title: string): string {
  return String(title ?? "").trim();
}

function normalizeBody(body: string): string {
  return String(body ?? "").trim();
}

function normalizeTag(tag?: string): string {
  const normalized = String(tag ?? "general").trim().toLowerCase();
  return normalized || "general";
}

function normalizeStatus(status?: string): JournalStatus {
  return status === "completed" ? "completed" : "active";
}

export class JournalEntry implements IJournalEntry {
  id: number;
  title: string;
  body: string;
  tag: string;
  status: JournalStatus;
  content: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(id: number, data: CreateJournalEntryData) {
    const title = normalizeTitle(data.title);
    const body = normalizeBody(data.body);

    this.id = id;
    this.title = title;
    this.body = body;
    this.tag = normalizeTag(data.tag);
    this.status = normalizeStatus(data.status);
    this.content = body;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }
}

export function createJournalEntry(
  id: number,
  data: CreateJournalEntryData,
): IJournalEntry {
  return new JournalEntry(id, data);
}

export function updateJournalEntry(
  entry: IJournalEntry,
  changes: Partial<Pick<IJournalEntry, "title" | "body" | "tag" | "status">>,
): IJournalEntry {
  if (typeof changes.title !== "undefined") {
    entry.title = normalizeTitle(changes.title);
  }
  if (typeof changes.body !== "undefined") {
    entry.body = normalizeBody(changes.body);
    entry.content = entry.body;
  }
  if (typeof changes.tag !== "undefined") {
    entry.tag = normalizeTag(changes.tag);
  }
  if (typeof changes.status !== "undefined") {
    entry.status = normalizeStatus(changes.status);
  }
  entry.updatedAt = new Date();
  return entry;
}

export function toJournalEntry(model: {
  id: number;
  title: string;
  body: string;
  tag: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): IJournalEntry {
  return {
    id: model.id,
    title: model.title,
    body: model.body,
    tag: normalizeTag(model.tag),
    status: normalizeStatus(model.status),
    content: model.body,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}
