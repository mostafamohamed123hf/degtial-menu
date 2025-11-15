const Role = require("../models/Role");
const asyncHandler = require("../middleware/async");

/**
 * @desc    Get all roles
 * @route   GET /api/roles
 * @access  Private/Admin
 */
exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find();
  res.status(200).json({ success: true, count: roles.length, data: roles });
});

/**
 * @desc    Get single role
 * @route   GET /api/roles/:id
 * @access  Private/Admin
 */
exports.getRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }

  res.status(200).json({ success: true, data: role });
});

/**
 * @desc    Create role
 * @route   POST /api/roles
 * @access  Private/Admin
 */
exports.createRole = asyncHandler(async (req, res) => {
  const role = await Role.create(req.body);
  res.status(201).json({ success: true, data: role });
});

/**
 * @desc    Update role
 * @route   PUT /api/roles/:id
 * @access  Private/Admin
 */
exports.updateRole = asyncHandler(async (req, res) => {
  let role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }

  role = await Role.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: role });
});

/**
 * @desc    Delete role
 * @route   DELETE /api/roles/:id
 * @access  Private/Admin
 */
exports.deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }

  await role.deleteOne();

  res.status(200).json({ success: true, data: {} });
});
