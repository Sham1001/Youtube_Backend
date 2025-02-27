import { ApiResponse } from "../utils/ApiResponse.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Subscribtion } from "../models/subscribtion.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import {mongoose} from "mongoose";
import { Video } from "../models/video.model.js";
// import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const getChannelStats = asyncHandler(async(req,res)=>{
    const userId = req.user?._id

    const userSubscription = await Subscribtion.aggregate([
        {
        $match:{
            channel: new mongoose.Types.ObjectId(userId)
        }
        },
        {
            $group:{
                _id:null,
                totalSubscriber:{
                    $sum:1
                }
            }
        }
        
])

    const like = await Video.aggregate([
        {
            $match:{
                owner:userId
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"videoLike"
            }
        },
        {
            $project:{
                totalLike:{
                    $size:"$videoLike"
                },
                totalView:"$views",
                totalVideo:1
            },
            
        },
        {
            $group:{
                _id:null,
                totalLike:{
                    $sum:"$totalLike"
                },
                totalView:{
                    $sum:"$totalView"
                },
                totalVideo:{
                    $sum:1
                }
            }
        }
    ])

    const channelInfo = {
        totalSubscriber : userSubscription[0]?.totalSubscriber || 0,
        totalVideo : like[0]?.totalVideo || 0,
        totalLike : like[0]?.totalLike || 0,
        totalView : like[0]?.totalView || 0
    }

    return res.status(200).json(new ApiResponse(200,channelInfo,"Channel info has been fetched successfully"))
})


const getChannelVideos = asyncHandler(async(req,res)=>{
    const {userId} = req.params
    console.log(userId)
    const {page=1,limit=10,sortOrder="desc",sortType="createdAt"} = req.query
    if(!userId){
        throw new apiError(400,"Yoouo have to loged in") 
    }

    const sortOption = {}
    if(sortType === "view"){
        sortOption[views]=sortOrder === "asce" ? 1: -1
    }
    else{
        sortOption[sortType] = sortOrder === "desc" ? -1 : 1
    }
    const aggregationPipeline = [
        {
            $match:{
                owner : new mongoose.Types.ObjectId(userId),
                isPublished:true
            }
        },
        // {
        //     $addFields: {
        //         createdAt: {
        //             $dateToParts: { date: "$createdAt" }
        //         }
        //     }
        // },
        // {
        //     $sort:sortOption
        // },
        // {
        //     $project:{
        //         _id:1,
        //         "videoFile.url":1,
        //         "thumbnail.url":1,
        //         title:1,
        //         description:1,
        //         views:1,
        //         // createdAt:{
                    
        //         //     year: 1,
        //         //     month: 1,
        //         //     day: 1
                    
        //         // }
        //         createdAt:1
        //     }
        // }
    ]
    console.log(aggregationPipeline)
    
    const options = {
        page:parseInt(page,10),
        limit:parseInt(limit,10)
    }

    const userChannelVideo = await Video.aggregatePaginate(
        Video.aggregate(aggregationPipeline),
        options
    )
    // if(userChannelVideo.docs.length === 0){
    //     throw res.status(404).send({message:"No videos found."})
    // }
    return res.status(200).json(new ApiResponse(200,userChannelVideo,"Channel video has been fetched successfully"))
})

export {
    getChannelStats,
    getChannelVideos
}
