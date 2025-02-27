import { Playlist } from "../models/playlist.model.js"
import { apiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import {mongoose, isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { pipeline } from "stream"

const createPlaylist = asyncHandler(async(req,res)=>{
    const {name, description} = req.body
    if(!(name && description)){
        throw new apiError(400,"Both field are required")
    }
    // const ownerDetail = await User.aggregate([
    //     {
    //     $match:{
    //         _id : new mongoose.Types.ObjectId(req.user?._id)
    //     }
    // },
    // {
    //     $project:{
    //         _id:1
    //     }
    // }
    // ]
    // )

    const ownerDetail = await User.findById(req.user?._id).select("-email -fullName -username -password -avatar -createdAt -updatedAt -coverImage -watchHistory -refreshToken")
    console.log(ownerDetail)

    const createThePlaylist = await Playlist.create({
        name,
        description,
        owner: ownerDetail
        // or
        // owner:req.user?._id
    })

    if (!createPlaylist) {
        throw new apiError(500, "failed to create playlist");
    }

    return res.status(201).json(new ApiResponse(201,createThePlaylist,"playlist has been created  successfully"))
})

const updatePlaylist = asyncHandler(async(req,res)=>{
    const {name, description} = req.body
    const { playlistId } = req.params
   if(!(name || description)){
    throw new apiError(400,"Atleast one field is required")
   }
   if(!playlistId){
    throw new apiError(400,"Playlist id is required")
   }
   if(!isValidObjectId(playlistId)){
    throw new apiError(400,"Invalid Playlist Id")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404,"Playlist not found")
        }
    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403,"You are not the owner of this playlist")
    }

    const playlistUpdate = await Playlist.findByIdAndUpdate(playlist._id,{
        $set:{
            name,
            description
        }
    },
{new:true}
)

    return res.status(200).json(new ApiResponse(200,playlistUpdate,"Playlist has been updated successfully"))
})

const deletePlaylist = asyncHandler(async(req,res)=>{
    const { playlistId } = req.params
    
    if(!playlistId){
        throw new apiError(400, "Playlist id is required")
    }

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403, "Only owner can delete the playlist")
    }

    const playlistDeleted = await Playlist.findByIdAndDelete(playlistId)

    if(!playlistDeleted){
        throw new apiError(500, "Failed to delete the playlist")
    }

    return res.status(200).json(new ApiResponse(200,{},"Playlist has been deleted successfully"))
})

const addVideoToPlaylist = asyncHandler(async(req,res)=>{
    const { videoId, playlistId }  = req.params
    if(!(videoId && playlistId)){
        throw new apiError(400, "Video id and playlist id are required")
    }
    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id")
    }
    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id")
    }
    const playlist = await Playlist.findById(playlistId)

    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403, "Only owner can add video to the playlist")
    }

    const video = await Video.aggregate([ 
        {
            $match:{
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            avatar:1,
                            username:1

                        }
                    }
                    
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first: "$owner"
                }
            }
        }
        
    ])
    if(video.length===0){
        throw new apiError(404, "Video not found")
    }

    const VideoToPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
        $addToSet:{
            video : video[0]?._id
        }
    },
{
    new: true
}
)
    if(!VideoToPlaylist){
        throw new apiError(500, "Failed to add video to the playlist")
        }

    return res.status(200).json(new ApiResponse(200,video[0],"video added successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async(req,res)=>{
    const {playlistId,videoId} = req.params
    if(!(playlistId && videoId)){
        throw new apiError(400, "playlistId && videoId is missing")
    }

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlistId")
    }

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid videoId")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404, "Video not found")
        }
    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403, "You are not the owner of the playlist")
    }
    const deleteVideoFromPlaylist = await Playlist.findByIdAndUpdate(playlist._id,{
        $pull:{
            video:videoId
        }
    },
{
    new:true
}
)
if(!deleteVideoFromPlaylist){
    throw new apiError(500, "Failed to remove video from the playlist")
}

return res.status(200).json(new ApiResponse(200,deleteVideoFromPlaylist,"Video has been successfully removed from the playlist"))
    
})

const getPlaylistById = asyncHandler(async(req,res)=>{
    const {playlistId} = req.params
    if(!playlistId){
        throw new apiError(400,"PlaylistId is missing")
    }
    if(!isValidObjectId(playlistId)){
        throw new apiError(400,"Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }

    const getPlaylist = await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId),
                isPublished:true
            }
        },
        // {
        //     $match:{
        //         isPublished:true
        //     }
        // },
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
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        },
                        
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            },
            
            
           
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$video"
                },
                totalViews:{
                    $sum:"$videos.views"
                },
                owner:{
                    $first:"$owner"
                },
                // video:{
                //     $first:"$video"
                // }
                
                
            }
            
        },
        {
            $project:{
                name:1,
                description:1,
                video:{
                    _id:1,
                    "videoFile.url":1,
                    title:1,
                    views:1,
                    "thumbnail.url":1,
                    duration:1,
                    owner:1
                },
                "owner.username":1,
                totalVideos:1,
                totalViews:1
            }
        }
    ])
    if (!playlist || playlist.length === 0) {
        throw new apiError(404, "Playlist not found or not published");
    }
    return res.status(200).json(new ApiResponse(200,getPlaylist[0],"Playlist has been fetched successfully"))
})

const getUserPlaylists = asyncHandler(async(req,res)=>{
    const{ userId } = req.params
    if(!userId){
        throw new apiError(400,"userId is missing")
    }
    if(!isValidObjectId(userId)){
        throw new apiError(400,"Invalid userId")
    }
    const user = await User.findById(userId)
    if(!user){
        throw new apiError(404,"User not found")
    }
    const playlist = await Playlist.aggregate(
        [
            {
                $match:{
                    owner:new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"video",
                    foreignField:"_id",
                    as:"videos"
                }
            },
            {
                $addFields:{
                    totalVideos:
                    {
                        $size:"$videos"
                    },
                    totalViews:{
                        $sum:"$videos.views"
                    }
                }
            },
            {
                $project:{
                    _id:1,
                    name:1,
                    description:1,
                    totalVideos:1,
                    totalViews:1,
                    updateAt:1
                }
            }
        ]
    )
    if(!playlist){
        throw new apiError(500,"Unable to find the playlist")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "User playlists fetched successfully"));
})

const togglePublishStatus = asyncHandler(async(req,res)=>{
    const {playlistId} = req.params
    if(!playlistId){
        throw new apiError(400,"playlistId is missing")
    }
    if(!isValidObjectId(playlistId)){
        throw new apiError(400,"Invalid playlistId")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(404,"playlist not found")
    }
    if(playlist?.owner.toString() !== req.user?._id.toString()){
        throw new apiError(401,"You are not the owner of this playlist")
    }
    const ToggleStatus = await Playlist.findByIdAndUpdate(playlist._id,{
        $set:{
            isPublished:!playlist?.isPublished
        }
        
    },
    {new:true}
                )
    if(!ToggleStatus){
        throw new apiError(500,"Failed to toggle video")
    }

    return res.status(200).json(new ApiResponse(200,ToggleStatus,"Playlist has been successfully toggled"))
})
export {createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
    togglePublishStatus}