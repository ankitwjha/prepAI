const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blacklist.model")

const JWT_SECRET = process.env.JWT_SECRET || "prep_ai_default_fallback_jwt_secret_key_2026";


async function authUser(req,res,next){

    const token = req.cookies.token

    if(!token){
        return res.status(401).json({
            message:"Token not provided"
        })
    }


    const isTokenBlackListed= await tokenBlackListModel.findOne({
        token
    })

    if(isTokenBlackListed){
        return res.status(401).json({
            message:"Token is invalid"
        })
    }

    try{  
             const decoded= jwt.verify(token, JWT_SECRET)
             req.user=decoded

            next()


        }catch(err){
            return res.status(401).json({
                message:"Invalid token"
            })
        }
}

module.exports={authUser}