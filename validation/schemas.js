import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password,
    role: z.enum(["admin", "shareholder"]),
    shareholderId: objectId.optional().nullable(),
  })
  .refine((v) => v.role !== "shareholder" || !!v.shareholderId, {
    message: "A shareholder account must be linked to a shareholder",
    path: ["shareholderId"],
  });

export const createInvitationSchema = z.object({
  shareholderId: objectId,
  expiryHours: z.union([z.literal(24), z.literal(48), z.literal(72)]),
});

// The invitation itself carries the email and shareholder link — accepting one
// only ever sets a name and password, so nobody can bind their account to a
// shareholder of their choosing.
export const acceptInvitationSchema = z.object({
  name: z.string().min(1),
  password,
});

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
  CostCategoryId: objectId.optional().nullable(),
  SubCategoryId: objectId.optional().nullable(),
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
  SubCategoryId: objectId.optional().nullable(),
  Description: z.string().optional(),
  Amount: z.number().positive(),
  Date: z.coerce.date().optional(),
  PaidTo: z.string().optional(),
  Notes: z.string().optional(),
});
