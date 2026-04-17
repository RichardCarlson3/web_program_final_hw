import type { Result } from "../lib/result";
import type { IJournalEntry, JournalStatus } from "../model/JournalEntry";
import type { JournalError } from "../service/errors";

export type CreateJournalEntryInput = {
  title: string;
  body: string;
  tag?: string;
};

export type JournalFilterStatus = "all" | JournalStatus;

export interface IJournalRepository {
  add(input: CreateJournalEntryInput): Promise<Result<IJournalEntry, JournalError>>;
  getById(id: number): Promise<Result<IJournalEntry, JournalError>>;
  getAll(): Promise<Result<IJournalEntry[], JournalError>>;
  search(query: string): Promise<Result<IJournalEntry[], JournalError>>;
  filterByStatus(status: JournalFilterStatus): Promise<Result<IJournalEntry[], JournalError>>;
  toggleById(id: number): Promise<Result<IJournalEntry, JournalError>>;
}
