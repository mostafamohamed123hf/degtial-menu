<<<<<<< HEAD
const express = require("express");
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

const router = express.Router();

router.route("/").get(getRoles).post(createRole);

router.route("/:id").get(getRole).put(updateRole).delete(deleteRole);

module.exports = router;
=======
const express = require("express");
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

const router = express.Router();

router.route("/").get(getRoles).post(createRole);

router.route("/:id").get(getRole).put(updateRole).delete(deleteRole);

module.exports = router;
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
