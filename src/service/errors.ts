export type JournalError =
  | { name: "EntryNotFound"; message: string }
  | { name: "InvalidContent"; message: string }
  | { name: "ValidationError"; message: string }
  | { name: "UnexpectedDependencyError"; message: string };

export const EntryNotFound = (message: string): JournalError => ({
  name: "EntryNotFound",
  message,
});

export const InvalidContent = (message: string): JournalError => ({
  name: "InvalidContent",
  message,
});

export const ValidationError = (message: string): JournalError => ({
  name: "ValidationError",
  message,
});

export const UnexpectedDependencyError = (message: string): JournalError => ({
  name: "UnexpectedDependencyError",
  message,
});
