import Investor from "../models/investor.model.js";
import InvestorProject from "../models/investorProject.model.js";
import InvestorPayment from "../models/investorPayment.model.js";
import Project from "../models/project.model.js";
import { investorPaymentSchema, investorProjectSchema } from "../validation/schemas.js";

export const getInvestors = async (_req, res) => {
  const [investors, assignments] = await Promise.all([
    Investor.find().sort({ createdAt: -1 }),
    InvestorProject.find().populate("ProjectId", "Name"),
  ]);
  const projectsByInvestor = new Map();
  for (const assignment of assignments) {
    const key = assignment.InvestorId.toString();
    const projects = projectsByInvestor.get(key) ?? [];
    if (assignment.ProjectId) {
      projects.push({
        ProjectId: assignment.ProjectId._id,
        ProjectName: assignment.ProjectId.Name,
      });
    }
    projectsByInvestor.set(key, projects);
  }
  res.json(
    investors.map((investor) => ({
      ...investor.toObject(),
      Projects: projectsByInvestor.get(investor._id.toString()) ?? [],
    }))
  );
};

export const createInvestor = async (req, res) => {
  const investor = await Investor.create(req.body);
  res.status(201).json(investor);
};

export const updateInvestor = async (req, res) => {
  const investor = await Investor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!investor) return res.status(404).json({ message: "Investor not found" });
  res.json(investor);
};

export const deleteInvestor = async (req, res) => {
  const investor = await Investor.findByIdAndDelete(req.params.id);
  if (!investor) return res.status(404).json({ message: "Investor not found" });
  const assignments = await InvestorProject.find({ InvestorId: investor._id }).select("_id");
  await InvestorProject.deleteMany({ InvestorId: investor._id });
  await InvestorPayment.deleteMany({ InvestorProjectId: { $in: assignments.map(({ _id }) => _id) } });
  res.json({ message: "Investor deleted" });
};

export const getInvestorProjects = async (req, res) => {
  const investor = await Investor.findById(req.params.investorId);
  if (!investor) return res.status(404).json({ message: "Investor not found" });
  const assignments = await InvestorProject.find({ InvestorId: investor._id }).populate("ProjectId", "Name");
  res.json(assignments);
};

export const createInvestorProject = async (req, res) => {
  const investor = await Investor.findById(req.params.investorId);
  if (!investor) return res.status(404).json({ message: "Investor not found" });
  const parsed = investorProjectSchema.safeParse({ ...req.body, InvestorId: req.params.investorId });
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  const project = await Project.findById(parsed.data.ProjectId);
  if (!project) return res.status(404).json({ message: "Project not found" });
  try {
    const assignment = await InvestorProject.create(parsed.data);
    res.status(201).json(await assignment.populate("ProjectId", "Name"));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Investor is already assigned to this project" });
    throw error;
  }
};

export const updateInvestorProject = async (req, res) => {
  const existing = await InvestorProject.findOne({
    _id: req.params.assignmentId,
    InvestorId: req.params.investorId,
  });
  if (!existing) return res.status(404).json({ message: "Investor project assignment not found" });
  const parsed = investorProjectSchema.safeParse({
    ...existing.toObject(),
    ...req.body,
    InvestorId: req.params.investorId,
    ProjectId: req.body.ProjectId ?? existing.ProjectId.toString(),
  });
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  const project = await Project.findById(parsed.data.ProjectId);
  if (!project) return res.status(404).json({ message: "Project not found" });
  const assignment = await InvestorProject.findByIdAndUpdate(existing._id, parsed.data, {
    new: true,
    runValidators: true,
  }).populate("ProjectId", "Name");
  res.json(assignment);
};

export const deleteInvestorProject = async (req, res) => {
  const deleted = await InvestorProject.findOneAndDelete({
    _id: req.params.assignmentId,
    InvestorId: req.params.investorId,
  });
  if (!deleted) return res.status(404).json({ message: "Investor project assignment not found" });
  await InvestorPayment.deleteMany({ InvestorProjectId: deleted._id });
  res.json({ message: "Investor project assignment deleted" });
};

export const createInvestorPayment = async (req, res) => {
  const assignment = await InvestorProject.findOne({
    _id: req.params.assignmentId,
    InvestorId: req.params.investorId,
  });
  if (!assignment) return res.status(404).json({ message: "Investor project assignment not found" });
  const parsed = investorPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  if (assignment.Paid + parsed.data.Amount > assignment.Amount) {
    return res.status(400).json({ message: "Payment cannot exceed the remaining due amount" });
  }
  const payment = await InvestorPayment.create({
    InvestorProjectId: assignment._id,
    ...parsed.data,
  });
  assignment.Paid += parsed.data.Amount;
  assignment.PaymentMethod = parsed.data.PaymentMethod;
  await assignment.save();
  res.status(201).json(payment);
};
