import { compare, hash } from 'bcryptjs';
import { HttpError } from '../middleware/errors.js';
import type { Credentials } from './schemas.js';
import { UserEmailConflictError } from './user-repository.js';
import type { StoredUser, UserRepository, UserRole } from './user-repository.js';

const BCRYPT_COST = 12;
const DUMMY_PASSWORD_HASH = '$2b$12$BaclpOsLoSrk0kZHMvJQ1ufR8BC.YwPguCmJXUEbOBUrHOhkiz0mC';

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export type TokenSigner = (user: { id: string; role: UserRole }) => Promise<string>;

/** Applies authentication rules using injected user storage and token signing. */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenSigner: TokenSigner,
  ) {}

  /** Creates a normal user and returns its token and public record. */
  async register(credentials: Credentials): Promise<AuthResult> {
    const passwordHash = await hashPassword(credentials.password);
    let user: StoredUser;
    try {
      user = await this.userRepository.insertUser(credentials.email, passwordHash);
    } catch (error) {
      if (error instanceof UserEmailConflictError) {
        throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }
    return this.createAuthResult(user);
  }

  /** Checks credentials without revealing whether the email exists. */
  async login(credentials: Credentials): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(credentials.email);
    const passwordMatches = await compare(
      credentials.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    return this.createAuthResult(user);
  }

  /** Builds the public authentication response from a stored user record. */
  private async createAuthResult(user: StoredUser): Promise<AuthResult> {
    const publicUser: PublicUser = { id: user.id, email: user.email, role: user.role };
    return { token: await this.tokenSigner(publicUser), user: publicUser };
  }
}

/** Hashes a password with bcrypt cost 12 for use by registration and the admin seed. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}
