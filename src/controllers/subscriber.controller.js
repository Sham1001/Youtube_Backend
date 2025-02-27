import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { apiError } from "../utils/apiError.js";
import { Subscribtion } from "../models/subscribtion.model.js"
import { isValidObjectId, mongoose } from "mongoose";
import { User } from "../models/user.model.js"
// import { Subscribtion } from "../models/subscribtion.model.js";
// import {mongoose, isValidObjectId } from "mongoose"


const toggleSubscription = asyncHandler(async(req,res)=>{
    const { channelId } = req.params
    if(!channelId){
        return new apiError(res,400,"Channel ID is required")
    }
    if(!isValidObjectId(channelId)){
        return new apiError(res,400,"Invalid channel ID")
    }
    const channel = await User.findById(channelId)
    if(!channel){
        return new apiError(res,404,"channel not found")
    }
    const isSubscribed = await Subscribtion.findOne(
        {
            subcriber:req.user?._id,
            channel:channelId
        }
    )
    if(isSubscribed){
        await Subscribtion.findByIdAndDelete(isSubscribed._id)

        return res.status(200).json(new ApiResponse(200,{subscribed: false},"We have succeessfully removed  the user Subscription"))
    }

    await Subscribtion.create({
        subcriber:req.user?._id,
        channel:channelId
    })
    return res.status(201).json(new ApiResponse(201,{subscribed: true},"We have succeessfully added the user Subscription"))

})

const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const { channelId } = req.params
    if(!channelId){
        return new apiError(res,400,"Channel ID is required")
    }
    if(!isValidObjectId(channelId)){
        return new apiError(res,400,"Invalid channel ID")
    }
    const channel = await User.findById(channelId)
    if(!channel){
        return new apiError(res,404,"channel not found")
    }
    const channelSubscribers = await Subscribtion.aggregate(
        [
            {
                $match:{
                    channel:new mongoose.Types.ObjectId(channelId)
                }
            },
            // {
            //     $lookup:{
            //         from:"users",
            //         localField:"channel",
            //         foreignField:"_id",
            //         as:"channel",
            //         pipeline:[
            //             {
            //                 $lookup:{
            //                     from:"subscribtions",
            //                     localField:"_id",
            //                     foreignField:"channel",
            //                     as:"channelInfo"
            //                 }
            //             },
            //             {
            //                 $addFields:{
            //                     channelSubscriberCount:{
            //                         $size:"$channelInfo.channel"
            //                     }
            //                 }
            //             },
            //         ]
            //     }
            // },
            {
                $lookup:{
                    from:"users",
                    localField:"subcriber",
                    foreignField:"_id",
                    as:"subcriber",
                    pipeline:[
                        {
                            $lookup:{
                                from:"subscribtions",
                                localField:"_id",
                                foreignField:"channel",
                                as:"channelUserInfo"
                            }
                        },
                        {
                            $addFields:
                            {
                                subscribedToSubscriber:{
                                    $cond:{
                                        if:{
                                            $in:[channelId,"$channelUserInfo.subcriber"]
                                        },
                                        then:true,
                                        else:false
                                    }
                                },
                                
                                subscriberCount:{
                                    $size:"$channelUserInfo.subcriber"
                                }
                            }
                           
                        }
                    ]
                }
            },
            {
                $unwind:"$subcriber"
            },
            {
                $project:{
                    // channel:{
                    //     channelSubscriberCount:1,
                    //     username:1,
                    //     avatar:1
                    // },
                    subcriber:{
                        username:1,
                        email:1,
                        fullName:1,
                        avatar:1,
                        subscribedToSubscriber:1,
                        subscriberCount:1
                    }
                }
            }
        ]
    )

    return res.status(200).json(new ApiResponse(200,channelSubscribers,"Channel user info has successfully fetched"))
})

const getSubscribedChannels = asyncHandler(async(req,res) =>{
    const {subscriberId} = req.params
    if(!subscriberId){
        throw new apiError(400,"subscriber ID is required")
    }
    if(!isValidObjectId(subscriberId)){
        throw new apiError(400,"Invalid subscriber ID")
    }
    const subscriber = await User.findById(subscriberId)
    if(!subscriber){
        throw new apiError(404,"subscriber not found")
    }
    const subscriberDetail = await Subscribtion.aggregate([
        {
            $match:{
                subcriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channelInfo",
                pipeline:[
                    // {
                    //     $lookup:{
                    //         from:"subscribtions",
                    //         localField:"_id",
                    //         foreignField:"channel",
                    //         as:"channelSubscriber"
                    //     }
                    // },
                    // {
                    //     $addFields:{
                    //         subscribedChannelSubscribCount:{
                    //             $size:"$channelSubscriber"
                    //         },
                    //         isChannelSubscribedUser:{
                    //             $cond:{
                    //                 if:{
                    //                     $in:[channelId,"$channelSubscriber.subcriber"]
                    //                 },
                    //                 then:true,
                    //                 else:false
                    //             }
                    //         }
                    //     }
                    // }
                    {
                        $lookup:{
                            from:"videos",
                            localField:"_id",
                            foreignField:"owner",
                            as:"video",
                            pipeline:[
                                {
                                    $match:{
                                        isPublished:true
                                    },

                                    // $sort:{
                                    //     creatrdAt:-1
                                    // }
                                },
                                // {
                                //     sort:{
                                //         $createdAt: -1
                                //     } //Sort videos by createdAt in descending order and return all the video 
                                // }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            latestVideo:{
                                $last:"$video"
                            }
                        }
                    }
                ]
            },
           
        },
        {
            $unwind:"$channelInfo"
        },
        {
            $project:{
                _id:0,
                channelInfo:{
                    id:1,
                    username:1,
                    avatar:1,
                    // isChannelSubscribedUser:1,
                    // subscribedChannelSubscribCount:1
                    latestVideo:{
                        _id:1,
                        "videoFile.url":1,
                        "thumbnail.url":1,
                        duration:1,
                        title:1,
                        description:1,
                        views:1,
                        createdAt: 1
                    }
                }
            }
        },
    ])

    if(subscriberDetail.length === 0){
        throw new apiError(404,"No subscribed channel Founnd")
    }

    return res.status(200).json(new ApiResponse(200,subscriberDetail,"Subscribed channels fetched successfully"))

})
export {toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels}