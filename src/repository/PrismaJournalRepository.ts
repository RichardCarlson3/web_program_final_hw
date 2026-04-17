import { PrismaClient } from "@prisma/client";
import { Err, Ok, Result } from "../lib/result";
import { IJournalEntry, toJournalEntry } from "../model/JournalEntry";
import {
  EntryNotFound,
  JournalError,
  UnexpectedDependencyError,
  ValidationError,
} from "../service/errors";
import {
  CreateJournalEntryInput,
  IJournalRepository,
  JournalFilterStatus,
} from "./JournalRespository";

class PrismaJournalRepository implements IJournalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(input: CreateJournalEntryInput): Promise<Result<IJournalEntry, JournalError>> {
    const title = String(input.title ?? "").trim();
    const body = String(input.body ?? "").trim();
    const tag = String(input.tag ?? "general").trim().toLowerCase();

    if (!title || !body) {
      return Err(ValidationError("Repository received empty title or body."));
    }

    try {
      const created = await this.prisma.journalEntry.create({
        data: { title, body, tag },
      });
      return Ok(toJournalEntry(created));
    } catch {
      return Err(
        UnexpectedDependencyError("Database write failed while creating journal entry."),
      );
    }
  }

  async getById(id: number): Promise<Result<IJournalEntry, JournalError>> {
    try {
      const row = await this.prisma.journalEntry.findUnique({ where: { id } });
      if (!row) {
        return Err(EntryNotFound(`Journal entry with id ${id} not found.`));
      }
      return Ok(toJournalEntry(row));
    } catch {
      return Err(
        UnexpectedDependencyError("Database read failed while loading journal entry."),
      );
    }
  }

  async getAll(): Promise<Result<IJournalEntry[], JournalError>> {
    try {
      const rows = await this.prisma.journalEntry.findMany({ orderBy: { id: "desc" } });
      return Ok(rows.map(toJournalEntry));
    } catch {
      return Err(
        UnexpectedDependencyError("Database read failed while listing journal entries."),
      );
    }
  }

  async search(query: string): Promise<Result<IJournalEntry[], JournalError>> {
    const q = query.trim();

    try {
      if (!q) {
        return this.getAll();
      }

      const rows = await this.prisma.journalEntry.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { body: { contains: q } },
            { tag: { contains: q } },
          ],
        },
        orderBy: { id: "desc" },
      });

      return Ok(rows.map(toJournalEntry));
    } catch {
      return Err(
        UnexpectedDependencyError("Database read failed while searching journal entries."),
      );
    }
  }

  async filterByStatus(
    status: JournalFilterStatus,
  ): Promise<Result<IJournalEntry[], JournalError>> {
    try {
      if (status === "all") {
        return this.getAll();
      }

      const rows = await this.prisma.journalEntry.findMany({
        where: { status },
        orderBy: { id: "desc" },
      });

      return Ok(rows.map(toJournalEntry));
    } catch {
      return Err(
        UnexpectedDependencyError("Database read failed while filtering journal entries."),
      );
    }
  }

  async toggleById(id: number): Promise<Result<IJournalEntry, JournalError>> {
    try {
      const found = await this.prisma.journalEntry.findUnique({ where: { id } });
      if (!found) {
        return Err(EntryNotFound(`Journal entry with id ${id} not found.`));
      }

      const updated = await this.prisma.journalEntry.update({
        where: { id },
        data: {
          status: found.status === "completed" ? "active" : "completed",
        },
      });

      return Ok(toJournalEntry(updated));
    } catch {
      return Err(
        UnexpectedDependencyError("Database update failed while toggling journal entry."),
      );
    }
  }
}

export function CreatePrismaJournalRepository(prisma: PrismaClient): IJournalRepository {
  return new PrismaJournalRepository(prisma);
}
