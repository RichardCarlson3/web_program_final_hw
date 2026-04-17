import { randomUUID } from "node:crypto";
import { Err, Ok, type Result } from "../lib/result";
import { UnexpectedDependencyError, type AuthError } from "./errors";
import type { IUserRepository, CreateUserInput } from "./UserRepository";
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

  async create(input: CreateUserInput): Promise<Result<IUserRecord, AuthError>> {
    try {
      const created: IUserRecord = {
        id: `user-${randomUUID()}`,
        email: input.email,
        displayName: input.displayName,
        password: input.password,
      };

      this.users.push(created);
      return Ok(created);
    } catch {
      return Err(UnexpectedDependencyError("Unable to create the user."));
    }
  }
}

export function CreateInMemoryUserRepository(): IUserRepository {
  return new InMemoryUserRepository([...DEMO_USERS]);
}