import { test } from "node:test";
import assert from "node:assert/strict";
import { cursor, decimalString, DESTRUCTIVE, fail, ok, orderId, READ_ONLY, WRITE } from "./util.js";

test("decimalString accepts decimal strings and rejects numbers-with-junk", () => {
  const d = decimalString(); // factory → fresh schema
  assert.equal(d.safeParse("150.00").success, true);
  assert.equal(d.safeParse("0").success, true);
  assert.equal(d.safeParse("-1.5").success, true);
  assert.equal(d.safeParse("1,50").success, false);
  assert.equal(d.safeParse("free").success, false);
  assert.equal(d.safeParse("").success, false);
});

test("schema factories return independent schemas (no $ref dedup)", () => {
  assert.notEqual(decimalString(), decimalString());
  assert.notEqual(cursor(), cursor());
  assert.notEqual(orderId(), orderId());
});

test("cursor is optional and rejects an empty string", () => {
  const c = cursor();
  assert.equal(c.safeParse(undefined).success, true);
  assert.equal(c.safeParse("abc").success, true);
  assert.equal(c.safeParse("").success, false);
});

test("ok emits compact JSON; fail flags isError", () => {
  assert.equal((ok({ a: 1 }).content[0] as { text: string }).text, '{"a":1}');
  const f = fail(new Error("boom"));
  assert.equal(f.isError, true);
  assert.match((f.content[0] as { text: string }).text, /boom/);
});

test("fail appends the underlying cause when present", () => {
  const err = new Error("timeout", { cause: new Error("ECONNRESET") });
  const f = fail(err);
  assert.match((f.content[0] as { text: string }).text, /timeout \(ECONNRESET\)/);
});

test("the three annotation presets set all four hints explicitly", () => {
  assert.deepEqual(READ_ONLY, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  });
  assert.deepEqual(WRITE, {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  });
  assert.deepEqual(DESTRUCTIVE, {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  });
});
