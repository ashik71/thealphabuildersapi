import { ROLES } from "../models/user.model.js";

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

// A shareholder account is only usable if it is actually linked to a
// Shareholder record — otherwise there is nothing to scope its access to, and
// it must be denied rather than falling through to an unscoped query.
export const shareholderOnly = (req, res, next) => {
  if (req.user?.role !== ROLES.SHAREHOLDER || !req.user.shareholderId) {
    return res.status(403).json({ message: "Shareholders only" });
  }
  next();
};
