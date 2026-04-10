import express from "express";
import translateController from "../controllers/translateController.js";

const router = express.Router();

router.route("/match").post(translateController.categorizeStrings);

export default router;