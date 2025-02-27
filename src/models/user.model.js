import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"  //check kaar na ye line baad me
import { parseArgs } from "util";
const userSchema = new Schema({
    username:{
      
        type : String,
        required:true,
        unique: true,
        lowercase: true,
        trim : true,
        index:true
    },

    email:{
        type:String,
        unique:true,
        required:true,
        lowercase:true,
        trim : true,
    },

    fullName:{
        type:String,
        required:true,
        lowercase:true,
        trim : true,
        index:true
    },
    password:{
        type:String,
        required:[true,"Password is required"]
    },

    avatar:{
        type:String,
        required:true
    },

    coverImage:{
        type:String,
        
    },

    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:'video'
        }
    ],

    refreshToken:{
        type:String
    }
},{timestamps:true});

userSchema.statics.isPasswordStrong = function (password) {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasspecialCharacter = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    return(
        password.length >= minLength &&
        hasUpper &&
        hasLower &&
        hasNumber &&
        hasspecialCharacter
    )
}

userSchema.statics.strongPasswordFeedback = function (password){
    const feedback = []
    if(password.length < 8) feedback.push("Password must be at least 8 characters long.")
    if(!/[A-Z]/.test(password)) feedback.push("Password must have at least one upper letter")
    if(!/[a-z]/.test(password)) feedback.push("Password must contain at least one lowercase letter.")
    if (!/\d/.test(password)) feedback.push("Password must contain at least one number.");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) feedback.push("Password must contain at least one special character.");

    return feedback.length === 0 ? "Password is strong" : feedback.join("")
}
userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next()

    this.password =await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
        _id : this._id,
        email : this.email,
        username : this.username,
        fullName : this.fullName
    },
    
    process.env.ACCESS_TOKEN_SECRET,
    {
        
        expiresIn :  process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
        _id : this._id,
        
    },
    
    process.env.REFRESH_TOKEN_SECRET,
    {
        
        expiresIn :  process.env.REFRESH_TOKEN_EXPIRY
    }
)

}

export const User = mongoose.model("User",userSchema)

