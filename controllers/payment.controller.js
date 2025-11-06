import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import Payment from "../models/payment.model.js";
dotenv.config();

// ✅ Get single Payment
export const getPaymentByProjectId = async (req, res) => {
  const cost = await Payment.findById(req.params.id);
  if (!cost) return res.status(404).json({ message: "Not found" });
  res.json(cost);
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