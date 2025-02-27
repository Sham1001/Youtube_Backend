import { Router } from "express";
import {createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
    togglePublishStatus} from '../controllers/playlist.controller.js';

import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router()

// router
router.route("/createPlaylist").post(verifyJWT,createPlaylist)
router.route("/c/:playlistId").patch(verifyJWT,updatePlaylist)
router.route("/c/:playlistId").delete(verifyJWT,deletePlaylist)
router.route("/add/:playlistId/:videoId").patch(verifyJWT,addVideoToPlaylist)
router.route("/remove/:playlistId/:videoId").delete(verifyJWT,removeVideoFromPlaylist)
router.route("/get/:playlistId").get(getPlaylistById)
router.route("/getUser/:userId").get(getUserPlaylists)
router.route("/toggle/:playlistId").patch(verifyJWT,togglePublishStatus)



export default router