import type { Result } from "../lib/result";
import type { AuthError } from "./errors";
import type { IUserRecord } from "./User";

export interface IUserRepository {
  findByEmail(email: string): Promise<Result<IUserRecord | null, AuthError>>;
}
