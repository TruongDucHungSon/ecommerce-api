import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

dotenv.config();
export const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Check if the user with the given username or email already exists
    const existingUser = await User.findOne({
      $or: [{ email }],
    });
    if (existingUser) {
      return res.send("Username or email already exists");
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      email,
      password: hashedPassword,
      lastName,
    });
    await newUser.save();

    res.status(201).json({
      status: "success",
      newUser,
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
    });
  }
};

export const login = async (req, res) => {
  const email = req.body.email;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch) {
      return res.status(404).json({ message: "Invalid Password" });
    }

    const { password, ...rest } = user._doc;

    // set token in the browser cookies and sen the respone to the clients
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.ACCESS_TOKEN,
      {
        expiresIn: "3d",
      }
    );
    res
      .cookie("accessToken", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      })
      .status(200)
      .json({ message: "successfully login", data: { ...rest, token } });
  } catch (error) {
    console.error(error);
    res.send("An error occurred");
  }
};
