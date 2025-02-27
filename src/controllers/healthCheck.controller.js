import { ApiResponse } from "../utils/ApiResponse.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthCheck = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,{},"Everything is OK"))
})

export {
    healthCheck
}