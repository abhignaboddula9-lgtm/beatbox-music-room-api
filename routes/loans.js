const express = require("express");
const { getId, sendNotFound } = require("./common");

const router = express.Router();
const loanDetailsQuery = `
  SELECT
    loans.loan_id,
    loans.musician_id,
    musicians.name AS musician_name,
    loans.instrument_id,
    instruments.name AS instrument_name,
    loans.loan_date,
    loans.return_date,
    loans.status
  FROM loans
  JOIN musicians ON loans.musician_id = musicians.musician_id
  JOIN instruments ON loans.instrument_id = instruments.instrument_id
`;

router.get("/", async (req, res) => {
  const loans = await req.app.locals.db.all(
    `${loanDetailsQuery} ORDER BY loans.loan_id`
  );
  res.json(loans);
});

router.get("/:id", async (req, res) => {
  const loan = await req.app.locals.db.get(
    `${loanDetailsQuery} WHERE loans.loan_id = ?`,
    getId(req)
  );
  if (!loan) return sendNotFound(res, "Loan");
  res.json(loan);
});

module.exports = router;
