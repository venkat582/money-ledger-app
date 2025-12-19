const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Login or create user
router.post("/login", async (req, res) => {
  const { name, mobile } = req.body;

  let user = await User.findOne({ mobile });
  if (!user) {
    user = await User.create({ name, mobile });
  }

  res.json(user);
});

module.exports = router;
