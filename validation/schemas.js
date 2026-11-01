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

const investorFields = {
  Name: z.string().trim().min(1, "Name is required"),
  Email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email("Invalid email address").optional()
  ),
  Phone: z.string().trim().min(7, "Phone number is required"),
  Notes: z.string().trim().optional(),
  Status: z.enum(["active", "inactive"]),
};

const validateNotesLength = (value, context) => {
  if (value.Notes && value.Notes.trim().split(/\s+/).length > 1000) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["Notes"], message: "Notes must be 1000 words or fewer" });
  }
};

export const investorSchema = z.object(investorFields).superRefine(validateNotesLength);
export const investorUpdateSchema = z.object(investorFields).partial().superRefine(validateNotesLength);

const notesSchema = z.string().trim().optional().superRefine((value, context) => {
  if (value && value.split(/\s+/).length > 1000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Notes must be 1000 words or fewer" });
  }
});

export const investorProjectSchema = z.object({
  InvestorId: objectId,
  ProjectId: objectId,
  Amount: z.number().finite().min(0),
  Paid: z.number().finite().min(0),
  ProfitMargin: z.number().finite().min(0),
  Deadline: z.coerce.date(),
  PaymentMethod: z.enum(["Bank", "Mobile Banking", "Cash"]),
  Notes: notesSchema,
  Status: z.enum(["pending", "paid", "overdue"]),
}).superRefine((value, context) => {
  if (value.Paid > value.Amount) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["Paid"], message: "Paid cannot exceed Amount" });
  }
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
  // When true, the amount is split equally across every shareholder with a
  // commitment on this project (see createExpense) — 400s server-side if
  // the project has none.
  SplitAmongShareholders: z.boolean().optional(),
  // Only meaningful alongside SplitAmongShareholders: true — whether each
  // shareholder's share should also be recorded as already paid.
  MarkSharesPaid: z.boolean().optional(),
});
