const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  personName: { type: String, required: true },

  type: {
    type: String,
    enum: ["LEND", "BORROW"],
    required: true
  },

  amount: { type: Number, required: true },
  givenDate: { type: Date, required: true },

  isClosed: { type: Boolean, default: false },
  closedDate: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Loan", loanSchema);
