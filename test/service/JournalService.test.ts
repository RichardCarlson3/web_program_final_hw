import type { IJournalEntry } from "../../src/model/JournalEntry";
import type {
  CreateJournalEntryInput,
  IJournalRepository,
} from "../../src/repository/JournalRespository";
import { Err, Ok } from "../../src/lib/result";
import { CreateJournalService } from "../../src/service/JournalService";
import { EntryNotFound } from "../../src/service/errors";

function makeEntry(
  id = 1,
  overrides: Partial<IJournalEntry> = {},
): IJournalEntry {
  const now = new Date("2026-02-19T00:00:00.000Z");
  const body = overrides.body ?? "This body is long enough";

  return {
    id,
    title: overrides.title ?? "Valid title",
    body,
    tag: overrides.tag ?? "general",
    status: overrides.status ?? "active",
    content: overrides.content ?? body,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function makeRepository(overrides: Partial<IJournalRepository> = {}): IJournalRepository {
  const defaultEntry = makeEntry();
  return {
    add: jest.fn().mockResolvedValue(Ok(defaultEntry)),
    getById: jest.fn().mockResolvedValue(Ok(defaultEntry)),
    getAll: jest.fn().mockResolvedValue(Ok([defaultEntry])),
    search: jest.fn().mockResolvedValue(Ok([defaultEntry])),
    filterByStatus: jest.fn().mockResolvedValue(Ok([defaultEntry])),
    toggleById: jest.fn().mockResolvedValue(Ok({ ...defaultEntry, status: "completed" })),
    ...overrides,
  };
}

describe("JournalService", () => {
  it("normalizes title, body, and tag before delegating to repository.add", async () => {
    const repo = makeRepository();
    const service = CreateJournalService(repo);

    const result = await service.createEntry({
      title: "  Valid title  ",
      body: "  This body is long enough  ",
      tag: "  General  ",
    });

    expect(result.ok).toBe(true);
    expect(repo.add).toHaveBeenCalledWith({
      title: "Valid title",
      body: "This body is long enough",
      tag: "general",
    } satisfies CreateJournalEntryInput);
  });

  it("returns InvalidContent for blank title or body", async () => {
    const repo = makeRepository();
    const service = CreateJournalService(repo);

    const result = await service.createEntry({
      title: " ",
      body: " ",
      tag: "general",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidContent");
      expect(result.value.message).toBe("Title and body are required.");
    }
    expect(repo.add).not.toHaveBeenCalled();
  });

  it("returns ValidationError for invalid title, body, or tag", async () => {
    const repo = makeRepository();
    const service = CreateJournalService(repo);

    const shortTitle = await service.createEntry({
      title: "No",
      body: "This body is long enough",
      tag: "general",
    });
    const shortBody = await service.createEntry({
      title: "Valid title",
      body: "short",
      tag: "general",
    });
    const badTag = await service.createEntry({
      title: "Valid title",
      body: "This body is long enough",
      tag: "BAD TAG",
    });

    expect(shortTitle.ok).toBe(false);
    expect(shortBody.ok).toBe(false);
    expect(badTag.ok).toBe(false);
  });

  it("delegates valid status filters and rejects invalid ones", async () => {
    const repo = makeRepository();
    const service = CreateJournalService(repo);

    const valid = await service.filterEntriesByStatus("completed");
    expect(valid.ok).toBe(true);
    expect(repo.filterByStatus).toHaveBeenCalledWith("completed");

    const invalid = await service.filterEntriesByStatus("done");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.value.name).toBe("ValidationError");
    }
  });

  it("passes through repository errors for toggleEntry", async () => {
    const repo = makeRepository({
      toggleById: jest
        .fn()
        .mockResolvedValue(Err(EntryNotFound("Journal entry with id 99 not found."))),
    });
    const service = CreateJournalService(repo);

    const result = await service.toggleEntry(99);

    expect(repo.toggleById).toHaveBeenCalledWith(99);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EntryNotFound");
    }
  });
});
