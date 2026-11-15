const assert = require("node:assert/strict");
const { once } = require("node:events");
const test = require("node:test");
const { initializeDatabase } = require("../database");
const { createApp } = require("../server");

test("instrument names are unique regardless of letter case", async (t) => {
  const db = await initializeDatabase(":memory:");
  const server = createApp(db).listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/instruments`;

  t.after(async () => {
    server.close();
    await once(server, "close");
    await db.close();
  });

  const createInstrument = (name, family = "Strings") =>
    fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, family }),
    });

  const guitarResponse = await createInstrument("Guitar 3");
  assert.equal(guitarResponse.status, 201);
  const guitar = await guitarResponse.json();

  const duplicateResponse = await createInstrument("guitar 3");
  assert.equal(duplicateResponse.status, 409);
  const duplicateBody = await duplicateResponse.json();
  assert.equal(duplicateBody.error, "An instrument with this name already exists");
  assert.doesNotMatch(JSON.stringify(duplicateBody), /SQLITE|constraint failed/i);

  const otherResponse = await createInstrument("Bass 1");
  assert.equal(otherResponse.status, 201);
  const other = await otherResponse.json();

  const duplicateRename = await fetch(`${baseUrl}/${other.instrument_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "GUITAR 3", family: "Strings" }),
  });
  assert.equal(duplicateRename.status, 409);
  const duplicateRenameBody = await duplicateRename.json();
  assert.equal(
    duplicateRenameBody.error,
    "An instrument with this name already exists"
  );
  assert.doesNotMatch(JSON.stringify(duplicateRenameBody), /SQLITE|constraint failed/i);

  const unchangedNameUpdate = await fetch(`${baseUrl}/${guitar.instrument_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Guitar 3", family: "Electric strings" }),
  });
  assert.equal(unchangedNameUpdate.status, 200);
  assert.equal((await unchangedNameUpdate.json()).name, "Guitar 3");

  const unusedNameUpdate = await fetch(`${baseUrl}/${other.instrument_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Bass 2", family: "Strings" }),
  });
  assert.equal(unusedNameUpdate.status, 200);
  assert.equal((await unusedNameUpdate.json()).name, "Bass 2");
});

test("SQLite prevents duplicate instrument names for simultaneous requests", async (t) => {
  const db = await initializeDatabase(":memory:");
  const server = createApp(db).listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/instruments`;

  t.after(async () => {
    server.close();
    await once(server, "close");
    await db.close();
  });

  const create = (name) =>
    fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, family: "Strings" }),
    });
  const responses = await Promise.all([create("Guitar 3"), create("guitar 3")]);

  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409]
  );
  const bodies = await Promise.all(responses.map((response) => response.json()));
  const conflictBody = bodies[responses.findIndex((response) => response.status === 409)];
  assert.equal(conflictBody.error, "An instrument with this name already exists");
  assert.doesNotMatch(JSON.stringify(conflictBody), /SQLITE|constraint failed/i);

  const rows = await db.all("SELECT instrument_id FROM instruments");
  assert.equal(rows.length, 1);
});
