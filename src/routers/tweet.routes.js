import { Router } from "express";
import {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
}                   from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = Router()

router.route("/create-Tweet").post(verifyJWT,createTweet)
router.route("/update-Tweet/:tweetId").patch(verifyJWT,updateTweet)
router.route("/delete-Tweet/:tweetId").delete(verifyJWT,deleteTweet)
router.route("/get-Tweets/:userId").get(verifyJWT,getUserTweets)

export default router