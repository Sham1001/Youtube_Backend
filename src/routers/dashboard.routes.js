import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {
    getChannelStats,
    getChannelVideos
    }   from "../controllers/dashboard.controller.js"

const router = Router()

router.route("/channel-stats").get(verifyJWT,getChannelStats)
router.route("/channel-video/:userId").get(verifyJWT,getChannelVideos)


export default router