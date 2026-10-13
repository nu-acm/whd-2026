import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const migrationsDirectory = fileURLToPath(new URL('../../drizzle/', import.meta.url));

/** Real SQLite queries with D1's asynchronous statements and atomic batches. */
export class TestD1 {
  readonly sqlite = new DatabaseSync(':memory:');
  failWhen: ((query: string) => boolean) | undefined;

  constructor() {
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    for (const file of readdirSync(migrationsDirectory)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      this.sqlite.exec(readFileSync(`${migrationsDirectory}${file}`, 'utf8'));
    }
  }

  get binding() {
    return this as unknown as D1Database;
  }

  prepare(query: string) {
    return new TestStatement(this, query);
  }

  async batch(statements: TestStatement[]) {
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map((statement) => statement.execute());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  seedUser(id: string, withProfile = true) {
    this.sqlite
      .prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)')
      .run(id, id, `${id}@example.com`);
    if (withProfile) {
      this.sqlite
        .prepare(
          `INSERT INTO participant
          (id, full_name, iin, phone, city, place_of_study, education_level)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, id, '000000000000', '77000000000', 'Test city', 'Test school', "Bachelor's");
    }
  }

  close() {
    this.sqlite.close();
  }
}

class TestStatement {
  private params: SQLInputValue[] = [];

  constructor(
    private db: TestD1,
    private query: string,
  ) {}

  bind(...params: SQLInputValue[]) {
    this.params = params;
    return this;
  }

  execute() {
    if (this.db.failWhen?.(this.query)) throw new Error('Injected database failure');
    const results = this.db.sqlite.prepare(this.query).all(...this.params);
    return { results, success: true, meta: {} };
  }

  async all() {
    return this.execute();
  }

  async run() {
    return this.execute();
  }

  async raw() {
    if (this.db.failWhen?.(this.query)) throw new Error('Injected database failure');
    const statement = this.db.sqlite.prepare(this.query);
    statement.setReturnArrays(true);
    return statement.all(...this.params);
  }
}
