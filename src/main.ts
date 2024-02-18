#!/usr/bin/env node --no-warnings --experimental-specifier-resolution=node --import=tsx/esm
import {
	Cause,
	Context,
	Effect,
	Exit,
	Option,
	ReadonlyArray,
	pipe,
} from 'effect';
import * as Path from 'node:path';
import * as Url from 'node:url';
import * as S from '@effect/schema/Schema';
import * as Sql from '@sqlfx/sqlite/node';
import { Config, Layer } from 'effect';

const __filename = Url.fileURLToPath(import.meta.url);

const __dirname = Path.dirname(__filename);

const db_path = Path.resolve(__dirname, '../test.sqlite3');

export const SqlLive = Sql.makeLayer({
	filename: Config.succeed(db_path),
}).pipe(Layer.orDie);

export class UserDbo extends S.Class<UserDbo>()({
	id: S.number,
	name: S.string,
}) {}

const make = Effect.gen(function* (_) {
	const sql = yield* _(Sql.tag);

	const GetById = sql.resolverId('GetUserById', {
		id: S.number,
		result: UserDbo,
		resultId: (_) => _.id,
		run: (ids) => sql`SELECT * FROM users WHERE id IN ${sql(ids)}`,
	});

	const getUserById = (id: number) =>
		Effect.gen(function* (_) {
			const user = yield* _(
				GetById.execute(id).pipe(Effect.map(Option.map((p) => new UserDbo(p))))
			);

			return user;
		});

	return { getUserById };
});

export class UserRepro extends Context.Tag('@context/UserRepro')<
	UserRepro,
	Effect.Effect.Success<typeof make>
>() {
	static Live = pipe(Layer.effect(UserRepro, make), Layer.provide(SqlLive));
}

const main = Effect.gen(function* (_) {
	const { getUserById } = yield* _(UserRepro);

	const allUsers = yield* _(
		Effect.all(
			pipe(
				[1, 2, 1],
				ReadonlyArray.map((id) => getUserById(id))
			),
			{ batching: false }
		)
	);

	console.log(allUsers);

	return null;
});

const program = pipe(main, Effect.provide(UserRepro.Live));

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
