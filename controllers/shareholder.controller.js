import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import Shareholder from "../models/shareholder.model.js";
dotenv.config();

// ✅ Get single Shareholder
export const getShareholders = async (req, res) => {
  const shareholders = await Shareholder.find();
  if (!shareholders) return res.status(404).json({ message: "Not found" });
  res.json(shareholders);
};

export const createShareholder = async (req, res) => {
  const newShareholder = new Shareholder(req.body);
  await newShareholder.save();
  res.status(201).json(newShareholder);
};

// ✅ Update Shareholder
export const updateShareholder = async (req, res) => {
  const updated = await Shareholder.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
};

// ✅ Delete Shareholder
export const deleteShareholder = async (req, res) => {
  await Shareholder.findByIdAndDelete(req.params.id);
  res.json({ message: "Shareholder deleted" });
};