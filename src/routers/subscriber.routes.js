import { Router } from "express";
import {toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels} from '../controllers/subscriber.controller.js';
import { verifyJWT} from '../middlewares/auth.middlewares.js'

const  router  = Router()


router.route("/toggle-Subscription/:channelId").patch(verifyJWT,toggleSubscription)
router.route("/user-Channel-Subscribers/:channelId").get(verifyJWT,getUserChannelSubscribers)
router.route("/subscribed-Channels/:subscriberId").get(verifyJWT,getSubscribedChannels)

export default router