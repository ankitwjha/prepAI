const mongoose= require ("mongoose")

const userSchema= new mongoose.Schema({
    username:{
        type:String,
        unique:[true, "Username already taken"],
        required:true,
    },

    email:{
        type:String,
        unique:[true, "Account already exists with this email"],
        required:true,
    },

    password:{
        type:String,
        required:true,
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    otp:{
        type:String
    },
    otpExpires:{
        type:Date
    }
})

const userModel=mongoose.model("users",userSchema)

module.exports=userModel