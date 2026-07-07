import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import Payment from "../models/payment.model.js";
dotenv.config();

// ✅ Get all Payments for a project
export const getPaymentsByProjectId = async (req, res) => {
  const payments = await Payment.find({
    ProjectId: req.params.projectId,
  })
    .populate("ShareholderId")
    .populate("CostCategoryId")
    .populate("SubCategoryId");
  res.json(payments);
};

export const createPayment = async (req, res) => {
  const newPayment = new Payment(req.body);
  await newPayment.save();
  res.status(201).json(newPayment);
};

// ✅ Delete Payment
export const deletePayment = async (req, res) => {
  await Payment.findByIdAndDelete(req.params.id);
  res.json({ message: "Payment deleted" });
};