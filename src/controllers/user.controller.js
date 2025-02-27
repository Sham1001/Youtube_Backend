import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { mongoose } from "mongoose";
// import { parseArgs } from "util";

// import {verifyJWT} from "../middlewares/auth.middlewares.js"


const generateAccessTokenAndRefreshToken = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new apiError(500,"Something went wrong while generating access token and refresh token")
    }
   
}

const registerUser = asyncHandler(async (req,res) =>{
    const {username,email,fullName,password} = req.body
    console.log(username,email,fullName,password)
    // console.log("email:",email)
    // console.log("password:",password)
    // console.log("username:",username)
    // console.log("fullName:",fullName)
    if(
        [username,email,fullName,password].some((field)=>
            field?.trim() === ""))
        
    {
        throw new apiError(400,"Please enter all the field")
    }
    const existingUser =await User.findOne(
        {
            $or: [{username},{email}]
        }
    )
    if(existingUser){
        throw new apiError(409,"User with the same email or username already exists")
    }

    if(!User.isPasswordStrong(password)){
        const feedback = await User.strongPasswordFeedback(password)
        throw new apiError(400,feedback)
        // throw new apiError(400,"Password is weak")
    }
    // const existingUserEmail = User.findOne({email})
    // if(existingUserEmail){
    //     throw new apiError(409,"this email already exist")
    // }
    // const existingUsername = User.findOne({username})
    // if(existingUsername){
    //     throw new apiError(409,"this user already exist")
    // }
    // console.log(req.files)
    const avatarCheck = req.files?.avatar[0]
    if(!avatarCheck){
        throw new apiError(400,"Please upload an avatar")
    }
        
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(avatarLocalPath)
   
    // const coverImagelocalPath = req.files?.coverImage[0]?.path;
    let coverImagelocalPath
    if(req.files && Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0)
    {coverImagelocalPath=req.files.coverImage[0].path}
        // {coverImagelocalPath = null}
    if(!avatarLocalPath)
        {throw new apiError(400,"Unable to get path from local server(mere laptop)")}
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log(avatar)
    const coverImage = await uploadOnCloudinary(coverImagelocalPath)
    if(!avatar){
        throw new apiError(400,"Avatara file is required")
    }
    const user=await User.create({
        username:username.toLowerCase(),
        password,
        email,
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
        )
    if(!createdUser){
        throw new apiError(500,"Something went wrong while registering the user")
    }
    
    // return res.status(201).json({createdUser})
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )


})

const loginUser = asyncHandler(async(req,res)=>{
    const {email,username,password} = req.body
    console.log(email)
    if(!email && !username){
        throw new apiError(400,"Username or email is required ")
    }
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new apiError(404,"User doesn't exist,Please check your email and  password")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new apiError(401,"Invalid password")
    }
    const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)

    const loggedUser=await User.findById(user._id).select("-password -refreshToken -watchHistory")
    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200).cookie("accessToken",accessToken, options).cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
    
})

const logoutUser = asyncHandler(async(req,res)=>{
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1
            }
            
        },
        {
            next : true
        }
    )
    // await user.findById(req.user?._id)
    // console.log(user)
    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out Successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new apiError(401,"unauthorized access")
    }
    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new apiError(401,"unauthorized access")
        }
        if(incomingRefreshToken!==user?.refreshToken){
            throw new apiError(401,"Refreesh Token is expired or used")
        }
        const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)
        const options = {
            httpOnly : true,
            secure : true
        }
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:refreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new apiError(401,error?.message || "Invalid refresh token")
        
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const{oldPassword,newPassword} = req.body
    if(!oldPassword || !newPassword){
        throw new apiError(400,"Please enter both old and new password")
    }
    // const{oldPassword,newPassword,confermPassword} = req.body
    // if(!(newPassword==confermPassword)){
    //     throw new apiError(400,"newPassword & confermPassword are different")
    // }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new apiError(400,"Invalid current Password")
    }
    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"User data is fetched successfully"))
})

const updateAccountDetail = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!(fullName||email)){
        throw new apiError(400,"All field are required")
    }
    const user = await User.findByIdAndUpdate(req.user._id,{
        $set:{fullName:fullName,
            email:email
        }

        
        
    },{new:true}
).select("-password")
return res.status(200).json(new ApiResponse(200,user,"Account detail are updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new apiError(400,"Avatar file is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new apiError(400,"Error while uploading on avatar")
    }
    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar:avatar.url
        }
    },{new:true}
).select("-password")
return res.status(200).json(new ApiResponse(200,user,"Avatar has been uploaded successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new apiError(400,"Cover Image file is missing")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new apiError(400,"Error while uploading on cover image")
    }
    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage:coverImage.url
        }
    },{new:true}
).select("-password")
return res.status(200).json(new ApiResponse(200,user,"Cover Image has been uploaded successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const{username}=req.params
    if(!username?.trim()){
        throw new apiError(400,"Username is missing")
    }
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscribtions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscribtions",
                localField:"_id",
                foreignField:"subcriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribtionsCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                email:1,
                fullName:1,
                avatar:1,
                coverImage:1,
                subscribtionsCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1
            }
        }

    ])
    if(!channel?.length){
        throw new apiError(404,"channel does not exists")
    }
    return res.status(200).json(new ApiResponse(200,channel[0],"User data fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
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
                                        fullName:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                       $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                       } 
                    }
                ]
            }
        }
    ])
    // if(!user?.length){
    //     throw new apiError(404,"User does not exists")
    //     }
    return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"watchHistory fetched successfully"))
})
export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory}