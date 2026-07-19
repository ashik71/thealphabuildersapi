import mongoose from "mongoose";
import ShareholderCommitment from "../models/shareholderCommitment.model.js";

/**
 * Resolves what the calling shareholder is allowed to read, and puts it on
 * `req.scope`. Runs after authMiddleware + shareholderOnly.
 *
 * Access is derived fresh from commitments on every request, so revoking a
 * commitment revokes portal access immediately.
 *
 * `req.scope.projectIds` is the ONLY thing downstream handlers may use to
 * decide which projects are visible — never a project id taken from the
 * request without checking it against this set.
 */
export const shareholderScope = async (req, res, next) => {
  const shareholderId = new mongoose.Types.ObjectId(req.user.shareholderId);

  const commitments = await ShareholderCommitment.find({
    ShareholderId: shareholderId,
  }).select("ProjectId");

  req.scope = {
    shareholderId,
    projectIds: commitments.map((c) => c.ProjectId),
    canAccessProject(projectId) {
      if (!mongoose.isValidObjectId(projectId)) return false;
      return this.projectIds.some((id) => id.equals(projectId));
    },
  };

  next();
};
