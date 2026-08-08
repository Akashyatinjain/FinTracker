import jwt from "jsonwebtoken";

export const generateToken = (res, user) => {
  const userId = user.user_id || user.id;
  const token = jwt.sign(
    { user_id: userId, email: user.email, role: user.role || "user" },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "7d" }
  );

  if (res && res.cookie) {
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  return token;
};

export default generateToken;
