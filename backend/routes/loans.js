function calculateInterest(amount, givenDate) {
  const monthlyInterest = (amount * 2) / 100; // ₹2 per ₹100

  const start = new Date(givenDate);
  const today = new Date();

  // Calculate full months difference
  let months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth());

  // If current day is BEFORE given day, last month not completed
  if (today.getDate() < start.getDate()) {
    months -= 1;
  }

  if (months < 0) months = 0;

  // Interest for completed months
  const fullMonthInterest = months * monthlyInterest;

  // Calculate extra days AFTER completed months
  const afterMonthsDate = new Date(start);
  afterMonthsDate.setMonth(start.getMonth() + months);

  const extraDays = Math.max(
    0,
    Math.floor((today - afterMonthsDate) / (1000 * 60 * 60 * 24))
  );

  const dailyInterest = monthlyInterest / 30;
  const extraInterest = dailyInterest * extraDays;

  return Math.round(fullMonthInterest + extraInterest);
}


const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");

// Get loans
// Get ALL loans (active + history)
router.get("/:userId", async (req, res) => {
  const loans = await Loan.find({
    userId: req.params.userId
  }).sort({ createdAt: -1 });

  const result = loans.map(loan => {
    const interest = calculateInterest(loan.amount, loan.givenDate);
    return {
      ...loan.toObject(),
      interest,
      total: loan.amount + interest
    };
  });

  res.json(result);
});


// Add loan
router.post("/add", async (req, res) => {
  try {
    console.log("ADD BODY:", req.body);

    const loan = new Loan({
      userId: req.body.userId,
      personName: req.body.personName,
      type: req.body.type,
      amount: req.body.amount,
      givenDate: req.body.givenDate,
      isClosed: false
    });

    await loan.save();

    res.json({ success: true, loan });
  } catch (err) {
    console.error("ADD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});





// Close loan
router.put("/close/:id", async (req, res) => {
  try {
    await Loan.findByIdAndUpdate(req.params.id, {
      isClosed: true,
      closedDate: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    console.error("CLOSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


//update loan
router.put("/:id", async (req, res) => {
  try {
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      {
        personName: req.body.personName,
        amount: req.body.amount,
        givenDate: req.body.givenDate,
        type: req.body.type
      },
      { new: true }
    );

    res.json({ success: true, loan });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

