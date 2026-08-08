import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUser,
} from "../models/userModel.js";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password, role } = req.body;
      const existing = await findUserByEmail(email);
      if (existing) return res.status(400).json({ msg: "Email already registered" });

      const newUser = await createUser({ name, email, password, role });
      const token = jwt.sign(
        { user_id: newUser.user_id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({ msg: "User registered successfully", user: newUser, token });
    } catch (err) {
      next(err);
    }
  }
);


router.post(
  "/login",
  [
    body("email").isEmail(),
    body("password").notEmpty(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await findUserByEmail(email);
      if (!user) return res.status(404).json({ msg: "User not found" });

      const bcrypt = await import("bcryptjs");
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

      const token = jwt.sign(
        { user_id: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        msg: "Login successful",
        user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.user_id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});


router.get("/all", verifyToken, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ msg: "Access denied" });
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});


router.put("/role/:id", verifyToken, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ msg: "Access denied" });
    const { role } = req.body;
    const updated = await updateUser(req.params.id, { role });
    res.json({ msg: "Role updated", user: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
