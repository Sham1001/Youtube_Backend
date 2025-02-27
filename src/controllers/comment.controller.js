import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {isValidObjectId,mongoose} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"



const getVideoComments = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    console.log(videoId)
    const {page=1, limit=10} = req.query
    if(!videoId){
        throw new apiError(400,"Video id is required")
    }
    if(!isValidObjectId(videoId)){
        throw new apiError(400,"Invalid video id")
    }
    const video = await Video.findById(videoId)
    console.log(video)
    if(!video){
        throw new apiError(404,"Video not found")
    }
    

    const  aggregationPipeline = [
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }       
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"userInfo"
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likeInfo"
            }
        },
                    // {
                    //     $match:{
                    //         owner:req.user?._id
                    //     }
                    // },
                    {
                        $addFields: {
                            likeCount: { $size: "$likeInfo" },
                            isLiked: {
                                $anyElementTrue: {
                                    $map: {
                                        input: "$likeInfo",
                                        as: "like",
                                        in: { $eq: ["$$like.likedBy", req.user?._id] },
                                    },
                                },
                            },
                        },
                    },      
                        
                   
                    
        {
            $unwind:{
                path: "$userInfo",
                preserveNullAndEmptyArrays: true
            } //----------------------> Run kar te time uncomment kar ke dekh na 
        },
                
            
        
        // {
        //     $unwind:"$commentInfo"
        // },
        {
            $project:{
               
                content:1,
                userInfo:{
                    username:1,
                    avatar:1,
                    fullName:1,
                }, 

            
        
            
        
                // userInfo:1,
                likeCount:1,
                isLiked: 1,
                createdAt:1,

            }
        }   
                
        
        

    // ])
    ]
    
    // console.log(videoComment)
   

    const options = {
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    }

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate(aggregationPipeline), // Aggregation pipeline
        options // Pagination options
    );

    if(comments.docs.length===0){
        throw res.status(404).json({message:"No comments found"})
    }

    return res.status(200).json(new ApiResponse(200,comments,"User comment on video has fetched successfully"))
})

const addComment = asyncHandler(async(req,res)=>{
    const {content} = req.body
    const {videoId} = req.params
    if(!videoId){
        throw new apiError(400,"Video id is required")
    }
    if(!isValidObjectId(videoId)){
        throw new apiError(400,"Invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(404,"Video not found")
    }
    if(!content){
        throw new apiError(400,"Content is required")
    }
    
    const comment = await Comment.create({
        content:content,
        video:videoId,
        owner:req.user._id
    })

    if(!comment){
        throw new apiError(500,"Comment not created")
    }

    return res.status(201).json(new ApiResponse(201,comment,"Comment has added successfully"))

})

const updateComment = asyncHandler(async(req,res)=>{
    const { content }  = req.body
    const { commentId } = req.params

    if(!commentId){
        throw new apiError(400,"comment id is required")
    }
    if(!isValidObjectId(commentId)){
        throw new apiError(400,"Invalid comment id")
    }
    
    if(!content){
        throw new apiError(400,"Content is required")
    }
   
    const comment = await Comment.findById(commentId)
    // const user = await User.findById(req.user._id)
    if(comment.owner.toString() !== req.user._id.toString()){
        throw new apiError(400,"You are not the owner ,you cant make changes")
    }
    // if(userId ==! req.user._id){
    //     throw new apiError(401,"You are not the owner of this comment ,You are not authorized to update this comment")
    // }
    const find = await Comment.findOne({
       _id:commentId,
       owner:req.user._id
    })
    if(!find){
        throw new apiError(404,"Comment not found")
    }
    const updatedComment = await Comment.findByIdAndUpdate(find._id,{
        $set:{
            content:content
        }

    },
    {new:true})

    return res.status(200).json(new ApiResponse(201,updatedComment,"Comment has successfuly comment"))
}
)

const deleteComment = asyncHandler(async(req,res)=>{
    const {commentId} = req.params
    if(!commentId){
        throw new apiError(400,"comment id is required")
    }
    if(!isValidObjectId(commentId)){
        throw new apiError(400,"Inavlid comment Id")
    }
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new apiError(404,"Comment not found")
    }
    if(comment.owner.toString() !== req.user._id.toString()){
        throw new apiError(401,"You are not the owner of this comment")
    }
    
    const deleteTheComment = await Comment.findByIdAndDelete(commentId)
    if(!deleteTheComment){
        throw new apiError(500,"Failed to  delete the comment please try again")
    }
    await Like.deleteMany({comment:commentId})

    return res.status(200).json(new ApiResponse(200,{commentId},"Comment has been deleted successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
    }

