import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { isValidObjectId, mongoose } from "mongoose";
import { Tweet } from "../models/tweet.model.js";

const createTweet = asyncHandler(async(req,res)=>{
    const {content} = req.body
    if(!content){
        throw new apiError(400,"Content is missing")
    }
    const owner = await User.findById(req.user?._id)
    if(!owner){
        throw new apiError(404,"Unable to get user Id")
    }
    const tweet = await Tweet.create(
        {
            content,
            owner:owner._id
        }
    )
    if(!tweet){
        throw new apiError(500,"Something went wrong,Try again later")
    }

    return res.status(201).json(new ApiResponse(201,createTweet,"Tweet has been created successfully"))
})

const updateTweet = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params
    const {content} = req.body
    if(!tweetId){
        throw new apiError(400,"Tweet Id is missing")
    }
    if(!isValidObjectId(tweetId)){
        throw new apiError(400,"Invalid Tweet Id")
    }
    
    if(!content){
        throw new apiError(400,"Content is missing")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new apiError(404,"Tweet not found")
    }
    if(tweet.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403,"You are not the owner of this tweet,Only owner can Update it")
    }
    const tweetUpdate = await Tweet.findByIdAndUpdate(tweetId,{
        $set:{
            content:content
        }
    },
    {new:true})
    if(!tweetUpdate){
        throw new apiError(500,"Something went wrong while updating the tweet,Try again later")
    }

    return res.status(200).json(new ApiResponse(200,tweetUpdate,"Tweet has been updated successfully"))
})

const deleteTweet = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params
    if(!tweetId){
        throw new apiError(400,"Tweet Id is missing")
    }
    if(!isValidObjectId(tweetId)){
        throw new apiError(400,"Invalid Tweet Id")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
      
        throw new apiError(404,"Tweet not found")
    }

    if(tweet.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403,"You are not the owner of this tweet,Only owner can delete it")
    }

    const tweetDelete = await Tweet.findByIdAndDelete(tweetId)

    if(!tweetDelete){
        throw new apiError(500,"Something went wrong while deleting the tweet,Try again later")
    }

    return res.status(200).json(new ApiResponse(200,{},"Tweet has been deleted successfully"))
})

const getUserTweets = asyncHandler(async(req,res)=>{
    const {userId} = req.params
    console.log(userId)
    if(!userId){
        throw new apiError(400,"User Id is missing")
    }
    if(!isValidObjectId(userId)){
        throw new apiError(400,"Invalid User Id")
    }
    const user = await User.findById(userId)
    console.log(user)
    if(!user){
      
        throw new apiError(404,"User not found")
    }

    const userTweet = await Tweet.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likes"
            }
        },
        {
            $addFields:{
                likeCount:{
                    $size:"$likes"
                },
                isLiked:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$likes.likedBy"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $project:{
                content:1,
                owner:{
                    username:1,
                    avatar:1
                },
                likeCount:1,
                isLiked:1
            }
        }
    ])
    if(userTweet.length === 0){
        throw new apiError(404,"NO tweet is found")
    }

    return res.status(200).json(new ApiResponse(200,userTweet,"User tweet has benn fetched successfully"))
})

export{
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
}