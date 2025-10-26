import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

export const login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const password = req.body.password;
  const secret = process.env.JWT_SECRET;
  if (!user) {
    return res.status(400).send("The user not found");
  }

  console.log(user, password);

  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    const token = jwt.sign(
      {
        userId: user.id,
        userName: user.name,
        isAdmin: user.isAdmin,
      },
      secret,
      { expiresIn: "1d" }
    );

    res.status(200).send({ email: user.email, isAdmin: user.isAdmin, token: token });
  } else {
    res.status(400).send("password is wrong!");
  }
};

export const register = async (req, res) => {
  console.log(req.boday)
  let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        isAdmin: req.body.isAdmin,
    })
    user = await user.save();

    if(!user)
    return res.status(400).send('the user cannot be created!')

    res.send(user);
};


