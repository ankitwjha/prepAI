const userModel = require("../models/user.model");
const bcrypt =require("bcryptjs")
const jwt=require("jsonwebtoken")
const tokenBlackListModel=require("../models/blacklist.model")


/**
 * @name registerUserController
 * @description register a new user, expects name username and email
 * @access public
 */
async function registerUserController(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Please provide username, email or password"
        });
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ username }, { email }] // $or: agar dono array mei se ek bhi satisfy hua to user ko aage badha dena
    });

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this username or email"
        });
    }
    const hash=await bcrypt.hash(password,10)

    const user=await userModel.create({
        username,
        email,
        password:hash
    })

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
    })

    return res.status(201).json({
        message :"User Registered successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}


/**
 * @name loginUserController
 * @description login a user, expects email and password
 * @access public   
 */
async function loginUserController(req,res){

    const {email,password}=req.body

    const user=await userModel.findOne({email})

    if(!user){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }

    const isPasswordValid= await bcrypt.compare(password,user.password)

    if(!isPasswordValid){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }

const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
)

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
    })
    res.status(200).json({
        message: "User logged in successfully",
        user:{
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}



/**
 * @name logoutUserController
 * @description clear token from user cookies and add the token in blacklsit collection 
 * @access public
 */
async function logoutUserController(req,res){
    const token=req.cookies.token

    if(token){
        await tokenBlackListModel.create({token})
    }
        res.clearCookie("token")

        return res.status(200).json({
            message:"User logged out successfully"
        })
    
}



/**
 * @name getMeController
 * @description get the current logged in user details
 * @access private
 */
async function getMeController(req, res) {
    const user = await userModel.findById(req.user.id)

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        })
    }

    res.status(200).json({
        message:"User details fetched successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}



module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
};
