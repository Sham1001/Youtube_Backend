import { Router } from "express";
import{publishAVideo,updateVideo,deleteVideo,getAllVideos,togglePublishStatus,getVideoById} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()

router.route("/publishAVideo").post(verifyJWT,upload.fields(
    [
    {
        name: 'videoFile',
        maxcount: 1
    },
    {
        name:'thumbnail',
        maxcount: 1
    }
    ]
    ),
    publishAVideo
    )
router.route("/c/:videoId").patch(verifyJWT,upload.single("thumbnail"),updateVideo)
router.route("/c/:videoId").delete(verifyJWT,deleteVideo)
router.route("/getAllVideos").get(getAllVideos)
router.route("/c/:videoId").get(verifyJWT,getVideoById)
router.route("/toggle/PublishStatus/:videoId").patch(verifyJWT,togglePublishStatus)


export default router