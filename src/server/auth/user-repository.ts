import type pg from 'pg';

export type UserRole = 'user' | 'admin';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
}

/** Identifies a registration that conflicts with the users table's unique email constraint. */
export class UserEmailConflictError extends Error {
  constructor() {
    super('A user with this email already exists');
    this.name = 'UserEmailConflictError';
  }
}

/** Performs parameterized SQL operations for authentication users. */
export class UserRepository {
  constructor(private readonly pool: pg.Pool) {}

  /** Inserts a normal user and returns the stored authentication record. */
  async insertUser(email: string, passwordHash: string): Promise<StoredUser> {
    try {
      const result = await this.pool.query<UserRow>(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, role',
        [email, passwordHash],
      );
      return mapUserRow(result.rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserEmailConflictError();
      }
      throw error;
    }
  }

  /** Finds a user by its normalized email address. */
  async findByEmail(email: string): Promise<StoredUser | null> {
    const result = await this.pool.query<UserRow>(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  /** Creates or promotes an administrator and refreshes the seeded password hash. */
  async upsertAdmin(email: string, passwordHash: string): Promise<StoredUser> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, role = 'admin'
       RETURNING id, email, password_hash, role`,
      [email, passwordHash],
    );
    return mapUserRow(result.rows[0]!);
  }
}

/** Converts the database column names to the repository's typed user record. */
function mapUserRow(row: UserRow): StoredUser {
  return { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role };
}

/** Recognizes PostgreSQL's unique-violation error code. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
