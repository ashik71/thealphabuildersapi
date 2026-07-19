import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/user.model.js";
dotenv.config();

export const login = async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = req.body.password;

  const user = await User.findOne({ email });

  // Same response whether the email is unknown or the password is wrong, so
  // the endpoint can't be used to enumerate which emails have accounts.
  const invalid = () =>
    res.status(401).json({ message: "Invalid email or password" });

  if (!user) return invalid();
  if (!bcrypt.compareSync(password, user.passwordHash)) return invalid();
  if (!user.isActive) {
    return res.status(403).json({ message: "Account is no longer active" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRY || "1d",
  });

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    shareholderId: user.shareholderId,
    token,
  });
};

// Admin-only. Shareholder sign-up happens exclusively through an invitation
// (see invitation.controller.js) — there is no open registration endpoint.
export const createUser = async (req, res) => {
  const email = req.body.email.toLowerCase().trim();

  if (await User.findOne({ email })) {
    return res
      .status(409)
      .json({ message: "A user with that email already exists" });
  }

  const user = await User.create({
    name: req.body.name,
    email,
    passwordHash: bcrypt.hashSync(req.body.password, 10),
    role: req.body.role,
    shareholderId: req.body.shareholderId || null,
  });

  res.status(201).json(user);
};

export const me = async (req, res) => {
  res.json(req.user);
};
