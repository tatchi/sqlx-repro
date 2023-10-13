import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Migrator from '@sqlfx/sqlite/Migrator/Node';
import { makeLayer } from '@sqlfx/sqlite/node';
import { Cause, Config, Effect, Exit, Layer, pipe, Console } from 'effect';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const db_path = resolve(__dirname, '../test.sqlite3');

const SqliteLive = makeLayer({
	filename: Config.succeed(db_path),
});

const MigratorLive = Layer.provide(
	SqliteLive,
	Migrator.makeLayer({
		loader: Migrator.fromDisk(`${__dirname}/migrations`),
		schemaDirectory: `${__dirname}/migrations`,
	})
);

const main = Effect.gen(function* (_) {
	yield* _(Console.log('HELLO'));

	return null;
});

const EnvLive = Layer.mergeAll(SqliteLive, MigratorLive);

const program = pipe(main, Effect.provide(EnvLive));

Effect.runPromiseExit(program).then((result) => {
	Exit.match(result, {
		onFailure: (cause) => {
			console.error(`Exited failure state: ${Cause.pretty(cause)}`);
		},
		onSuccess: () => {
			console.log(`Exited with success value`);
		},
	});
});
