import { Err, Result } from "../lib/result";
import { IJournalEntry } from "../model/JournalEntry";
import {
  CreateJournalEntryInput,
  IJournalRepository,
} from "../repository/JournalRespository";
import { InvalidContent, JournalError, ValidationError } from "./errors";

export interface IJournalService {
  createEntry(input: CreateJournalEntryInput): Promise<Result<IJournalEntry, JournalError>>;
  listEntries(): Promise<Result<IJournalEntry[], JournalError>>;
  toggleEntry(id: number): Promise<Result<IJournalEntry, JournalError>>;
  searchEntries(query: string): Promise<Result<IJournalEntry[], JournalError>>;
  filterEntriesByStatus(status: string): Promise<Result<IJournalEntry[], JournalError>>;
}

class JournalService implements IJournalService {
  constructor(private readonly repository: IJournalRepository) {}

  async createEntry(input: CreateJournalEntryInput): Promise<Result<IJournalEntry, JournalError>> {
    const title = String(input.title ?? "").trim();
    const body = String(input.body ?? "").trim();
    const tag = String(input.tag ?? "general").trim().toLowerCase();

    if (!title || !body) {
      return Err(InvalidContent("Title and body are required."));
    }

    if (title.length < 3) {
      return Err(ValidationError("Title must be at least 3 characters."));
    }

    if (body.length < 8) {
      return Err(ValidationError("Body must be at least 8 characters."));
    }

    if (!/^[a-z0-9-]{2,20}$/.test(tag)) {
      return Err(
        ValidationError("Tag must be 2-20 chars (lowercase letters, numbers, hyphen)."),
      );
    }

    return this.repository.add({ title, body, tag });
  }

  async listEntries(): Promise<Result<IJournalEntry[], JournalError>> {
    return this.repository.getAll();
  }

  async toggleEntry(id: number): Promise<Result<IJournalEntry, JournalError>> {
    return this.repository.toggleById(id);
  }

  async searchEntries(query: string): Promise<Result<IJournalEntry[], JournalError>> {
    return this.repository.search(query);
  }

  async filterEntriesByStatus(status: string): Promise<Result<IJournalEntry[], JournalError>> {
    const normalized = status.trim().toLowerCase();
    if (!normalized) {
      return Err(ValidationError("Status filter is required."));
    }

    if (normalized !== "all" && normalized !== "active" && normalized !== "completed") {
      return Err(ValidationError("Status filter must be all, active, or completed."));
    }

    return this.repository.filterByStatus(normalized);
  }
}

export function CreateJournalService(repository: IJournalRepository): IJournalService {
  return new JournalService(repository);
}
