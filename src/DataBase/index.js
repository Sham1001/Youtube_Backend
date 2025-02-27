import mongoose from 'mongoose'
import {DB_Name} from "../constants.js"

const connectDB = async () => {
    try {
        const conectoinInstance = await mongoose.connect(`${process.env.MONOGODB_URI}${DB_Name}`)
            console.log(`\n MongoDB has connected succesfully !!! DB Host :
                 ${conectoinInstance.connection.host}`)
    }
    catch (error){
        console.log("Error: MongoDB connection failed", error)
        process.exit(1)
    }
    
}

export default connectDB