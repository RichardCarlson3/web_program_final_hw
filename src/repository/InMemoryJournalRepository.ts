import { Err, Ok, Result } from "../lib/result";
import {
  createJournalEntry,
  IJournalEntry,
  updateJournalEntry,
} from "../model/JournalEntry";
import {
  EntryNotFound,
  JournalError,
  ValidationError,
} from "../service/errors";
import {
  CreateJournalEntryInput,
  IJournalRepository,
  JournalFilterStatus,
} from "./JournalRespository";

class InMemoryJournalRepository implements IJournalRepository {
  private entries: IJournalEntry[] = [];
  private nextId = 1;

  async add(input: CreateJournalEntryInput): Promise<Result<IJournalEntry, JournalError>> {
    const title = String(input.title ?? "").trim();
    const body = String(input.body ?? "").trim();
    const tag = String(input.tag ?? "general").trim().toLowerCase();

    if (!title || !body) {
      return Err(ValidationError("Repository received empty title or body."));
    }

    const entry = createJournalEntry(this.nextId++, { title, body, tag });
    this.entries.push(entry);
    return Ok(entry);
  }

  async getById(id: number): Promise<Result<IJournalEntry, JournalError>> {
    const found = this.entries.find(entry => entry.id === id);
    if (!found) {
      return Err(EntryNotFound(`Journal entry with id ${id} not found.`));
    }
    return Ok(found);
  }

  async getAll(): Promise<Result<IJournalEntry[], JournalError>> {
    return Ok([...this.entries].sort((a, b) => b.id - a.id));
  }

  async search(query: string): Promise<Result<IJournalEntry[], JournalError>> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return this.getAll();
    }

    const filtered = this.entries
      .filter(entry => `${entry.title} ${entry.body} ${entry.tag}`.toLowerCase().includes(q))
      .sort((a, b) => b.id - a.id);

    return Ok(filtered);
  }

  async filterByStatus(
    status: JournalFilterStatus,
  ): Promise<Result<IJournalEntry[], JournalError>> {
    if (status === "all") {
      return this.getAll();
    }

    const filtered = this.entries
      .filter(entry => entry.status === status)
      .sort((a, b) => b.id - a.id);

    return Ok(filtered);
  }

  async toggleById(id: number): Promise<Result<IJournalEntry, JournalError>> {
    const found = this.entries.find(entry => entry.id === id);
    if (!found) {
      return Err(EntryNotFound(`Journal entry with id ${id} not found.`));
    }

    const nextStatus = found.status === "completed" ? "active" : "completed";
    return Ok(updateJournalEntry(found, { status: nextStatus }));
  }
}

export function CreateInMemoryJournalRepository(): IJournalRepository {
  return new InMemoryJournalRepository();
}
