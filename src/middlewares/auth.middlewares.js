import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req,_,next)=>{           //yaha jo res ki position thi osme apan _ bhi daal sakte hai(ye tab hi kar sakte hai jab res ko apne function me use hi nahi kiye hai)
    try {
        const token=req.cookies?.accessToken || req.header("Authorization").replace("Bearer ","")
        
        if(!token){
            throw new apiError(401,"Unauthorizd Access")
        }
        const decodeToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user=await User.findById(decodeToken?._id).select("-password -refreshToken")
        if(!user){
            throw new apiError(401,"Invalid Accesstoken")
        }
        req.user=user
        next()
    } catch (error) {
        throw new apiError(401,error?.message || "Invalid Access Token")
    }
})
    
