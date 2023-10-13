import * as Sql from '@sqlfx/sqlite/Client';
import { Effect, pipe } from 'effect';

export default pipe(
  Sql.tag,
  Effect.flatMap(
    (sql) => sql`
    CREATE TABLE "people" (
      "id" integer NOT NULL,
      "name" text NOT NULL,
      "data" text NOT NULL,
      PRIMARY KEY (id)
    )
  `,
  ),
  Effect.tap(() => Effect.sync(() => console.log(`migration ran`))),
);

// CREATE TABLE "User" ("id" integer NOT NULL, "name" text NOT NULL, PRIMARY KEY (id));
