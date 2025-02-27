import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
    healthCheck
import { healthCheck } from "../controllers/healthCheck.controller.js"

const router = Router()

router.route("/health-check").get(verifyJWT,healthCheck)

export default router