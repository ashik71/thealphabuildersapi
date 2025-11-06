import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import CostCategory from "../models/costCategory.model.js";
dotenv.config();

// ✅ Get single CostCategory
export const getCostByProjectId = async (req, res) => {
  const cost = await CostCategory.findById(req.params.id);
  if (!cost) return res.status(404).json({ message: "Not found" });
  res.json(cost);
};

export const createCostCategory = async (req, res) => {
  const newCost = new CostCategory(req.body);
  await newCost.save();
  res.status(201).json(newCost);
};

// ✅ Update CostCategory
export const updateCostCategory = async (req, res) => {
  const updated = await CostCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
};

// ✅ Delete CostCategory
export const deleteCostCategory = async (req, res) => {
  await CostCategory.findByIdAndDelete(req.params.id);
  res.json({ message: "Cost Category deleted" });
};