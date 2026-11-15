const express = require("express");
const {
  assertBody,
  getId,
  sendNotFound,
  stringField,
} = require("./common");

const router = express.Router();
const instrumentColumns = "instrument_id, name, family";

router.get("/", async (req, res) => {
  const family = typeof req.query.family === "string" ? req.query.family.trim() : "";
  const instruments = family
    ? await req.app.locals.db.all(
        `SELECT ${instrumentColumns} FROM instruments WHERE family = ? ORDER BY instrument_id`,
        family
      )
    : await req.app.locals.db.all(
        `SELECT ${instrumentColumns} FROM instruments ORDER BY instrument_id`
      );

  res.json(instruments);
});

router.get("/:id", async (req, res) => {
  const instrument = await req.app.locals.db.get(
    `SELECT ${instrumentColumns} FROM instruments WHERE instrument_id = ?`,
    getId(req)
  );
  if (!instrument) return sendNotFound(res, "Instrument");
  res.json(instrument);
});

router.post("/", async (req, res) => {
  assertBody(req.body);
  const name = stringField(req.body, "name", { required: true });
  const family = stringField(req.body, "family", { required: true });
  const result = await req.app.locals.db.run(
    "INSERT INTO instruments (name, family) VALUES (?, ?)",
    name,
    family
  );
  const instrument = await req.app.locals.db.get(
    `SELECT ${instrumentColumns} FROM instruments WHERE instrument_id = ?`,
    result.lastID
  );
  res.status(201)
    .location(`/api/instruments/${result.lastID}`)
    .json(instrument);
});

router.put("/:id", async (req, res) => {
  assertBody(req.body);
  const id = getId(req);
  const name = stringField(req.body, "name", { required: true });
  const family = stringField(req.body, "family", { required: true });
  const result = await req.app.locals.db.run(
    "UPDATE instruments SET name = ?, family = ? WHERE instrument_id = ?",
    name,
    family,
    id
  );
  if (!result.changes) return sendNotFound(res, "Instrument");

  const instrument = await req.app.locals.db.get(
    `SELECT ${instrumentColumns} FROM instruments WHERE instrument_id = ?`,
    id
  );
  res.json(instrument);
});

router.delete("/:id", async (req, res) => {
  const result = await req.app.locals.db.run(
    "DELETE FROM instruments WHERE instrument_id = ?",
    getId(req)
  );
  if (!result.changes) return sendNotFound(res, "Instrument");
  res.status(204).end();
});

module.exports = router;
