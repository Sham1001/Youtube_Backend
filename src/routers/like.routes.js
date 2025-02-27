import { Router } from "express";
import {toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos} from "../controllers/like.controller.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()

router.route("/toggle/video-like/:videoId").post(verifyJWT,toggleVideoLike)
router.route("/toggle/Comment-Like/:commentId").post(verifyJWT,toggleCommentLike)
router.route("/toggle/Tweet-Like/:tweetId").post(verifyJWT,toggleTweetLike)
router.route("/get/Liked-Videos/:userId").get(verifyJWT,getLikedVideos)

export default router