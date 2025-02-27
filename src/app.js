import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())




// router import
import userRouter from "./routers/user.routes.js"
import videoRouter from "./routers/video.routes.js"
import playlistRouter from "./routers/playlist.routes.js"
import likeRouter from "./routers/like.routes.js"
import subscribtionRouter from "./routers/subscriber.routes.js"
import commentRouter from "./routers/comment.routes.js"
import dashboardRouter from "./routers/dashboard.routes.js"
import healthCheckRouter from "./routers/healthCheck.routes.js"
import tweetRouter from "./routers/tweet.routes.js"

 
app.use("/api/v1/users",userRouter)
app.use("/api/v1/videos",videoRouter)
app.use("/api/v1/playlists",playlistRouter)
app.use("/api/v1/likes",likeRouter)
app.use("/api/v1/subscribtions",subscribtionRouter)
app.use("/api/v1/comments",commentRouter)
app.use("/api/v1/dashboard",dashboardRouter)
app.use("/api/v1/healthcheck",healthCheckRouter)
app.use("/api/v1/tweets",tweetRouter)

export {app}