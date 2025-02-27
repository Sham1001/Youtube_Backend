import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {getVideoComments,
    addComment,
    updateComment,
    deleteComment,} from "../controllers/comment.controller.js"
// import router from "./like.routes";

const router = Router()

router.route("/get-comment/:videoId").get(verifyJWT,getVideoComments)
router.route("/add-comment/:videoId").post(verifyJWT,addComment)
router.route("/update-comment/:commentId").patch(verifyJWT,updateComment)
router.route("/delete-comment/:commentId").delete(verifyJWT,deleteComment)

export default router