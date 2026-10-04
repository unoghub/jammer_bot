import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import type { Config } from "../../config/Config.ts";
import { TOKENS } from "../../config/tokens.ts";
import * as schema from "./schema.ts";

@injectable()
export class DatabaseService {
  private readonly client: Client;
  readonly db: LibSQLDatabase<typeof schema>;

  constructor(@inject(TOKENS.Config) config: Config) {
    this.client = createClient({
      url: config.tursoDatabaseUrl,
      authToken: config.tursoAuthToken,
    });
    this.db = drizzle(this.client, { schema });
  }

  async checkConnection(): Promise<void> {
    await this.db.run(sql`select 1`);
  }

  close(): void {
    this.client.close();
  }
}
