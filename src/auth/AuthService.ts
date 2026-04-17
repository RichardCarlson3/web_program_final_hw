import { Err, Ok, type Result } from "../lib/result";
import {
  InvalidCredentials,
  UnexpectedDependencyError,
  ValidationError,
  type AuthError,
} from "./errors";
import { toAuthenticatedUser, type IAuthenticatedUser } from "./User";
import type { IUserRepository } from "./UserRepository";

export interface LoginInput {
  email: string;
  password: string;
}

export interface IAuthService {
  authenticate(input: LoginInput): Promise<Result<IAuthenticatedUser, AuthError>>;
}

class AuthService implements IAuthService {
  constructor(private readonly users: IUserRepository) {}

  async authenticate(input: LoginInput): Promise<Result<IAuthenticatedUser, AuthError>> {
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    if (!email) {
      return Err(ValidationError("Email is required."));
    }

    if (!email.includes("@")) {
      return Err(ValidationError("Email must look like an email address."));
    }

    if (!password.trim()) {
      return Err(ValidationError("Password is required."));
    }

    const userResult = await this.users.findByEmail(email);
    if (userResult.ok === false) {
      const error = userResult.value;
      return Err(UnexpectedDependencyError(error.message));
    }

    // This demo compares raw passwords so students can see the auth flow clearly.
    // In a production app, this is where we would compare password hashes instead.
    if (!userResult.value || userResult.value.password !== password) {
      return Err(InvalidCredentials("Invalid email or password."));
    }

    return Ok(toAuthenticatedUser(userResult.value));
  }
}

export function CreateAuthService(users: IUserRepository): IAuthService {
  return new AuthService(users);
}
