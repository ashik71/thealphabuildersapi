export const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin)
    return res.status(403).json({ message: "Admins only" });
  next();
};
