const assert = require("node:assert/strict");
const { once } = require("node:events");
const test = require("node:test");
const { initializeDatabase } = require("../database");
const { createApp } = require("../server");

test("API validates instruments and musicians and returns joined loans", async (t) => {
  const db = await initializeDatabase(":memory:");
  const server = createApp(db).listen(0);
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.close();
    await once(server, "close");
    await db.close();
  });

  const request = (path, options = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  const jsonRequest = (method, body) => ({
    method,
    body: JSON.stringify(body),
  });

  const instrumentsResponse = await request("/api/instruments");
  assert.equal(instrumentsResponse.status, 200);
  assert.deepEqual(await instrumentsResponse.json(), []);

  const emptyNameResponse = await request(
    "/api/instruments",
    jsonRequest("POST", { name: " ", family: "Strings" })
  );
  assert.equal(emptyNameResponse.status, 400);

  const instrumentResponse = await request(
    "/api/instruments",
    jsonRequest("POST", { name: "Guitar 3", family: "Strings" })
  );
  assert.equal(instrumentResponse.status, 201);
  const instrument = await instrumentResponse.json();

  const duplicateInstrumentResponse = await request(
    "/api/instruments",
    jsonRequest("POST", { name: "guitar 3", family: "Strings" })
  );
  assert.equal(duplicateInstrumentResponse.status, 409);
  assert.deepEqual(await duplicateInstrumentResponse.json(), {
    error: "An instrument with this name already exists",
  });

  const getInstrumentResponse = await request(
    `/api/instruments/${instrument.instrument_id}`
  );
  assert.equal(getInstrumentResponse.status, 200);
  assert.equal((await getInstrumentResponse.json()).name, "Guitar 3");

  const familyResponse = await request("/api/instruments?family=Strings");
  assert.equal(familyResponse.status, 200);
  assert.equal((await familyResponse.json()).length, 1);

  const unchangedNameResponse = await request(
    `/api/instruments/${instrument.instrument_id}`,
    jsonRequest("PUT", { name: "Guitar 3", family: "Electric strings" })
  );
  assert.equal(unchangedNameResponse.status, 200);

  const renameSourceResponse = await request(
    "/api/instruments",
    jsonRequest("POST", { name: "Bass 1", family: "Strings" })
  );
  assert.equal(renameSourceResponse.status, 201);
  const renameSource = await renameSourceResponse.json();

  const duplicateRenameResponse = await request(
    `/api/instruments/${renameSource.instrument_id}`,
    jsonRequest("PUT", { name: "GUITAR 3", family: "Strings" })
  );
  assert.equal(duplicateRenameResponse.status, 409);

  const unusedRenameResponse = await request(
    `/api/instruments/${renameSource.instrument_id}`,
    jsonRequest("PUT", { name: "Bass 2", family: "Strings" })
  );
  assert.equal(unusedRenameResponse.status, 200);
  assert.equal((await unusedRenameResponse.json()).name, "Bass 2");

  const missingInstrumentResponse = await request("/api/instruments/99999");
  assert.equal(missingInstrumentResponse.status, 404);
  const invalidInstrumentIdResponse = await request("/api/instruments/nope");
  assert.equal(invalidInstrumentIdResponse.status, 400);
  const missingFamilyResponse = await request(
    `/api/instruments/${instrument.instrument_id}`,
    jsonRequest("PUT", { name: "Guitar 3" })
  );
  assert.equal(missingFamilyResponse.status, 400);

  const deleteInstrumentResponse = await request(
    `/api/instruments/${renameSource.instrument_id}`,
    { method: "DELETE" }
  );
  assert.equal(deleteInstrumentResponse.status, 204);

  const missingMusicianResponse = await request("/api/musicians/99999");
  assert.equal(missingMusicianResponse.status, 404);
  const missingDepartmentResponse = await request(
    "/api/musicians",
    jsonRequest("POST", { name: "Avery Quinn" })
  );
  assert.equal(missingDepartmentResponse.status, 400);

  const musicianResponse = await request(
    "/api/musicians",
    jsonRequest("POST", { name: "Avery Quinn", department: "Strings" })
  );
  assert.equal(musicianResponse.status, 201);
  const musician = await musicianResponse.json();

  const musicianListResponse = await request("/api/musicians");
  assert.equal(musicianListResponse.status, 200);
  assert.equal((await musicianListResponse.json()).length, 1);

  const musicianUpdateResponse = await request(
    `/api/musicians/${musician.musician_id}`,
    jsonRequest("PUT", { name: "Avery Quinn", department: "Guitar" })
  );
  assert.equal(musicianUpdateResponse.status, 200);
  assert.equal((await musicianUpdateResponse.json()).department, "Guitar");

  const invalidMusicianIdResponse = await request("/api/musicians/nope");
  assert.equal(invalidMusicianIdResponse.status, 400);

  const emptyLoansResponse = await request("/api/loans");
  assert.equal(emptyLoansResponse.status, 200);
  assert.deepEqual(await emptyLoansResponse.json(), []);

  const loanInsert = await db.run(
    "INSERT INTO loans (musician_id, instrument_id, loan_date, status) VALUES (?, ?, ?, ?)",
    musician.musician_id,
    instrument.instrument_id,
    "2026-11-15",
    "active"
  );

  const loansResponse = await request("/api/loans");
  assert.equal(loansResponse.status, 200);
  const loans = await loansResponse.json();
  assert.equal(loans.length, 1);
  assert.equal(loans[0].musician_name, "Avery Quinn");
  assert.equal(loans[0].instrument_name, "Guitar 3");

  const loanByIdResponse = await request(`/api/loans/${loanInsert.lastID}`);
  assert.equal(loanByIdResponse.status, 200);
  const loan = await loanByIdResponse.json();
  assert.equal(loan.musician_name, "Avery Quinn");
  assert.equal(loan.instrument_name, "Guitar 3");

  const missingLoanResponse = await request("/api/loans/99999");
  assert.equal(missingLoanResponse.status, 404);
});
