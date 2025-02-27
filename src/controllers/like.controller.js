import { isValidObjectId } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js"
import { User } from "../models/user.model.js"
import {Video} from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    if(!videoId){
        throw new apiError(400,"Video id is required")
    }
    if(!isValidObjectId(videoId)){
        throw new apiError(400,"Invalid video id")
    }
    if(!req.user && req.user._id){
        throw new apiError(400,"User Id is not found")
    }
    const isLiked = await Like.findOne({
        video:videoId,
        likedBy:req.user?._id
    })
    if(isLiked){
        await Like.findByIdAndDelete(isLiked._id)

        return res.status(200).json(new ApiResponse(200,{isLiked:false},"Video like is removed successfully"))
    }

    await Like.create({
        video:videoId,
        likedBy:req.user?._id

    })

    return res.status(200).json(new ApiResponse(200,{isLiked:true},"Video like is added successfully"))
})

const toggleCommentLike = asyncHandler(async(req,res)=>{
    const {commentId} = req.params
    if(!commentId){
        throw new apiError(400,"Comment id is required")
    }
    if(!isValidObjectId(commentId)){
        throw new apiError(400,"Invalid Comment id")
    }
    const isLiked = await Like.findOne(
        {
            comment:commentId,
            likedBy:req.user?._id
        }
    )
    if(isLiked){
        await Like.findByIdAndDelete(isLiked._id)

        return res.status(200).json(new ApiResponse(200,{isLiked:false},"Comment like is removed successfully"))

    }

    await Like.create(
        {
            comment:commentId,
            likedBy:req.user?._id
        }
    )

    return res.status(200).json(new ApiResponse(200,{isLiked:true},"Comment like is added successfully"))

})


const  toggleTweetLike = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params

    if(!tweetId){
        throw new apiError(400,"Tweet id is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new apiError(400,"Invalid tweet id")
    }

    const isLiked = await Like.findOne(
        {
            tweet:tweetId,
            likedBy:req.user?._id
        }
    )

    if(isLiked){
        await Like.findByIdAndDelete(isLiked._id)

        return res.status(200).json(new ApiResponse(200,{isLiked:false},"Tweet like is removed successfully"))

    }

    await Like.create(
        {
            tweet:tweetId,
            likedBy:req.user?._id
        }
    )
    return res.status(200).json(new ApiResponse(200,{isLiked:true},"Tweet like is added successfully"))

})

const getLikedVideos = asyncHandler(async(req,res)=>{
    const {userId} = req.params 

    if(!userId){
        throw new apiError(400,"User id is required")
    }

    if(!isValidObjectId(userId)){
        throw new apiError(400,"Invalid User id")
    }

    const user = await User.findById(userId)

    if(!user){
        throw new apiError(404,"User not found")
    }

    const likedVideo = await Like.aggregate(
        [
           {
            $match:{
                likedBy:user._id
            }
           },
           {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                           
                        }
                    
                    },
                {
                    $unwind:"$owner"
                }
                // {
                //     $addFields:{
                //         owner:{
                //             $first:"$owner"
                //         }
                //     }
                // }
                ]
            }
           },
           {
            $unwind:"$video"
           },
        // {
            
        //         $addFields:{
        //             video:{
        //                 $first:"$video"
        //             }
        //         }
            
        // },
           
           {
            $project:{
                video:{
                    title:1,
                    description:1,
                    duration:1,
                    "thumbnail.url":1,
                    videoFile:1,
                    "owner.username":1,
                    "owner.avatar":1,
                    createdAt:1
                },
                
            }
           }
        ]
    )
    if(!likedVideo){
        throw new apiError(500,"unable to find the liked video")
    }
    return res.status(200).json(new ApiResponse(200,likedVideo,"Liked video fetched successfully"))
})

export {toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos}