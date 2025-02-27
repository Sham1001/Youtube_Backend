import { asyncHandler } from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deletOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {apiError} from "../utils/apiError.js";
import jwt from "jsonwebtoken"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js";
import { isValidObjectId, mongoose } from "mongoose";
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"

const getAllVideos = asyncHandler(async(req,res)=>{
    const {page=1, limit = 10, query, sortBy, sortType, userId} = req.query
    const pipeline = []

    if(query){
        pipeline.push({
            $search:{
                index: "search-videos",
                text:{
                    query:query,
                    path: ["title","description"],
                    fuzzy: {
                        maxEdits: 2, // Enable fuzzy search
                        prefixLength: 3
                    }
                }
            }
        })
    }
    if(userId){
        if(!isValidObjectId(userId)){
            throw new apiError(400,"Invalid userId")
        }
        pipeline.push({
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        })

    }

    pipeline.push({
        $match:{
            isPublished:true
        }
    })

    if(sortBy && sortType){
        pipeline.push({
            $sort:{
                [sortBy]:sortType === "asc" ? 1 : -1
            }
        })
    }
    else{
        pipeline.push({
            $sort:{
                createdAt : -1
            }
        })
    }

    pipeline.push({
        
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetail",
                pipeline:[
                    {
                        $project:{
                            avatar : 1,
                            username:1
                        }
                    }
                ]
            }
        
    },
   {
    $unwind: "$ownerDetail"
   }
    )
    const videoAggregate = Video.aggregate(pipeline)

    const options = {
        page: parseInt(page,10),
        limit:parseInt(limit,10)
    }
    const video = await Video.aggregatePaginate(videoAggregate,options)

    return res.status(200).json(new ApiResponse(200,video,"Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async(req,res)=>{
    const {title,description} = req.body
    // if(!(title && description)) {
    //     throw new apiError(400,"Please enter all the field")
    // }
    if([title,description].some((field)=>field.trim()==="")){
        throw new apiError(400,"Please enter all the field")
    }
    
    if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
        throw new apiError(400, "Please upload video and thumbnail");
    }

    const videoFileCheck = req.files.videoFile[0];
    const thumbnailFileCheck = req.files.thumbnail[0];

    // Check if video and thumbnail files are valid
    if (!videoFileCheck || !thumbnailFileCheck) {
        throw new apiError(400, "Please upload valid video and thumbnail files");
    }

    const videoFileLocalPath = videoFileCheck.path;
    const thumbnailLocalPath = thumbnailFileCheck.path;
    if(!videoFileLocalPath){
        throw new apiError(400,"Please select a video file")
    }
    if(!thumbnailLocalPath){
        throw new apiError(400,"Please select a thumbnail")
        }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!videoFile || !videoFile.secure_url) {
        throw new apiError(400, "Failed to upload video file");
    }
    if (!thumbnail || !thumbnail.secure_url) {
        throw new apiError(400, "Failed to upload thumbnail");
    }
    const owner =await User.findById(req.user._id).select("-email -fullName -password -avatar -createdAt -updatedAt -coverImage -watchHistory -refreshToken")

    const video = await Video.create({
        title:title,
        description:description,
        videoFile:{
            public_id:videoFile.public_id,
            url:videoFile.url
        },
        thumbnail:{
            public_id:thumbnail.public_id,
            url:thumbnail.url
        },
        owner:owner._id,
        duration:videoFile.duration,
        isPublished:false

    })

    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"));
})

const getVideoById = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    if(!videoId){
        throw new apiError(400,"VideoId not found")
    }
    // if(!isValidObjectId(videoId)){
    //     throw new apiError(400,"Invalid video id")
    // }
    if(!isValidObjectId(req.user?._id)){
        throw new apiError(401,"Invalid user id")
    }

    const video = await Video.aggregate([
        {
            $match:{
                    _id:new mongoose.Types.ObjectId(videoId)
                    }
            
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            },
            
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscribtions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers"
                        }
                    },
                    {
                        $addFields:{
                            subscriberCount:{
                                $size:"$subscribers"
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{
                                        $in:[req.user?._id,"$subscribers.subscriber"]
                                    },
                                    then:true,
                                    else:false,
                                }
                            }
                           
                        }
                        
                    },
                    {
                        $project:{
                            username:1,
                            avatar:1,
                            isSubscribed:1,
                            subscriberCount:1,
                        }
                    }
                
                ]
            }
            
        },
        {
            $addFields:{
                likeCount:{
                    $size:"$likes"
                },
                owner:{
                    $first: "$owner"
                },
                isLiked:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$likes.likedBy"]
                        },
                        then:true,
                        else:false,
                    }
                }
            }
        },
        {
            $project:{
                likeCount:1,
                owner:1,
                isLiked:1,
                "videoFile.url":1,
                "thumbnail.url":1,
                duration:1,
                createdAt:1,
                isPublished:1,
                title:1,
                description:1,
                view:1
            }
        }
        
    ])
    if(!video){
        throw new apiError(500,"Failed to fetch video")
    }
    await Video.findByIdAndUpdate(videoId,{
        $inc:{
            view:1
        }

    })
    await User.findByIdAndUpdate(req.user?._id,{
        $addToSet:{
            watchHistory:videoId
        }
    })
    
    return res.status(200).json(new ApiResponse(200,video[0],"video detail fetched successfully"))
})

const updateVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    if(!videoId){
             throw new apiError(400,"VideoFile is missing")
        }
    if(!isValidObjectId(videoId)){
        throw new apiError(400,"Invalid VideoId")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found");
    }
    if(video.owner?.toString()!==req.user?._id.toString()){
        throw new apiError(403,"You are not the owner of this video")
    }
    // if(videoId?.trim()){
    //     throw new apiError(400,"VideoFile is missing")
    // }
    const {title,description} = req.body
    if(!(title && description)){
        throw new apiError(400,"Both field are required ")
    }
    const thumbnailToDelet = video.thumbnail.public_id
    const thumbnailLocalPath = req.file?.path
    if(!thumbnailLocalPath){
        throw new apiError(400,"Thumbnail file is missing")

    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    // const video = await Video.find(videoId)
    const videoInfoUpdate =await Video.findByIdAndUpdate(video._id,{
        $set:{
            title:title,
            description:description,
            thumbnail:{
                url:thumbnail.url,
                public_id:thumbnail.public_id
            }
        }
    },
{new:true})

if(!videoInfoUpdate){
    throw new apiError(500,"failed to upload the detail please try again later")
}
if(videoInfoUpdate){
    await deletOnCloudinary(thumbnailToDelet)
}
return res.status(200).json(new ApiResponse(200,videoInfoUpdate,"Info uodated successfuly"))


})

const deleteVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    if(!videoId){
        throw new apiError(400,"Video id is missing")
    }
    if(!isValidObjectId(videoId)){
        throw new apiError(400,"invalid video")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404,"Video not found")
        }
    if(video?.owner.toString() !== req.user?.id.toString()){
        throw new apiError(403,"You are not the owner of this video")
    }
    const videoDeleted = await Video.findByIdAndDelete(video.id)
    if(!videoDeleted){
        throw new apiError(500,"Failed to delete the video")
        }
        await deletOnCloudinary(video.thumbnail.public_id)
        await deletOnCloudinary(video.videoFile.public_id,"video")

        await Like.deleteMany({
            video:videoId
        })

        await Comment.deleteMany({
            video:videoId
        })

    return res.status(200).json(new ApiResponse(200,{},"Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    if(!videoId){
        throw new apiError(400,"Video Id is missing")
    }
    if(!isValidObjectId(videoId)){
        throw new apiError(400,"Invalid video Id")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404,"Video not found")
    }
    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new apiError(401,"You are not the owner of this video")
    }
    const ToggleStatus = await Video.findByIdAndUpdate(video._id,{
        $set:{
            isPublished:!video?.isPublished
        }
        
    },
    {new:true}
                )
    if(!ToggleStatus){
        throw new apiError(500,"Failed to toggle video")
    }

    return res.status(200).json(new ApiResponse(200,ToggleStatus,"Video has been successfully toggled"))
})
export { publishAVideo,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getVideoById,
    getAllVideos
     };