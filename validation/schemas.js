import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const projectSchema = z.object({
  Name: z.string().min(1),
  Location: z.string().optional(),
  Summary: z.string().optional(),
  EstimatedCost: z.number().min(0).optional(),
  ActualCost: z.number().min(0).optional(),
  StartDate: z.coerce.date().optional(),
  EndDate: z.coerce.date().optional(),
  Status: z.enum(["planned", "in-progress", "completed", "on-hold"]).optional(),
});

export const shareholderSchema = z.object({
  Name: z.string().min(1),
  Phone: z.string().optional(),
  Email: z.string().email().optional(),
});

export const paymentSchema = z.object({
  ProjectId: objectId,
  ShareholderId: objectId,
  CostCategoryId: objectId.optional(),
  AmountPaid: z.number().positive(),
  Date: z.coerce.date().optional(),
  Notes: z.string().optional(),
});

export const shareholderCommitmentSchema = z.object({
  ProjectId: objectId,
  ShareholderId: objectId,
  CommittedAmount: z.number().positive(),
  Notes: z.string().optional(),
});

export const expenseSchema = z.object({
  ProjectId: objectId,
  CostCategoryId: objectId,
  SubCategoryId: objectId.optional(),
  Description: z.string().optional(),
  Amount: z.number().positive(),
  Date: z.coerce.date().optional(),
  PaidTo: z.string().optional(),
  Notes: z.string().optional(),
});
