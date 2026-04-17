import type { Result } from "../lib/result";
import type { AuthError } from "./errors";
import type { IUserRecord } from "./User";

export interface CreateUserInput {

  email: string;

  displayName: string;

  password: string;

}

export interface IUserRepository {
  findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>>;
  create(input: CreateUserInput): Promise<Result<IUserRecord, AuthError>>;
}
