import dotenv from "dotenv"
import connectDB from "./DataBase/index.js"
import {app} from "./app.js"

dotenv.config({
    path: './.env'
})


connectDB()
.then(()=>{
    // app.on("error",(error)=>{
    //     console.log("Error: Connectuion to the server is failed !!!", error)
    //     process.exit(1)
    // })
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running on port : ${process.env.Port}`)
    })
    })
    // console.log(`Server is running on port : ${process.env.Port}`)

.catch((error)=>{
    console.log("Connection to the database has failed !!!",error)
})