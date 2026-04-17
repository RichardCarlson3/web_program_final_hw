import { Err, Ok, type Result } from "../lib/result";
import { UnexpectedDependencyError, type AuthError } from "./errors";
import type { IUserRepository } from "./UserRepository";
import type { IUserRecord } from "./User";

export const DEMO_USERS: IUserRecord[] = [
  {
    id: "user-alice",
    email: "alice@journal.test",
    displayName: "Alice Journal",
    password: "password123",
  },
  {
    id: "user-bob",
    email: "bob@journal.test",
    displayName: "Bob Journal",
    password: "password123",
  },
];

class InMemoryUserRepository implements IUserRepository {
  constructor(private readonly users: IUserRecord[]) {}

  async findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>> {
    try {
      const match = this.users.find((user) => user.email === email) ?? null;
      return Ok(match);
    } catch {
      return Err(UnexpectedDependencyError("Unable to read the demo users."));
    }
  }
}

export function CreateInMemoryUserRepository(): IUserRepository {
  // We keep users in memory in this lecture so students can focus on auth flow first.
  return new InMemoryUserRepository(DEMO_USERS);
}
