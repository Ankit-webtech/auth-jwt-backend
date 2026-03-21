import { LoginSchema, registerSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import User from "../models/User.js";
import TryCatch from "../middlewares/TryCatch.js";
import sanitize from "mongo-sanitize";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendMail from "../config/sendMail.js";
import { getOtpHtml, getVerifyEmailHtml } from "../config/html.js";
import { generateAccessToken, generateToken, revokeRefreshToken, verifyRefreshToken } from "../config/generateToken.js";
import { generateCSRFToken } from "../config/csrfMiddleware.js";

/////// registerUser Controller
export const registerUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = registerSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "Validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "validation error",
        code: issue.code || "validation_error",
      }));
      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  ///// If validation is successful, you can access the validated data using validation.data
  let { name, email, password } = validation.data;

  ///ratelimiting logic will be here
  const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;

  if (await redisClient.get(rateLimitKey)) {
    return res.status(429).json({
      message: "Too many registration attempts. Please try again later.",
    });
  }

  ///////// Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    // If this is NOT null, the user exists
    return res.status(400).json({
      message: "User already exists with this email",
    });
  }
  //////hash the password before saving to database
  const hashedPassword = await bcrypt.hash(password, 10);

  ////////check token its verify or not
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyKey = `verify:${verifyToken}`;

  ///////store the user data in redis with the verify token as key, and set an expiration time for the token (e.g., 24 hours)
  const dataToStore = JSON.stringify({
    name,
    email,
    password: hashedPassword,
  });
  await redisClient.set(verifyKey, dataToStore, { EX: 300 });
  //////verify email
  const subject = "Verify your email for Account creation ";
  const html = getVerifyEmailHtml({ email, token: verifyToken });

  await sendMail(email, subject, html);
  await redisClient.set(rateLimitKey, "true", { EX: 60 });

  res.json({
    message:
      "if your email is valid , a verification like has been sent. it will expire in 5 minutes",
  });
});

// ///////////////// verify user
// export const verifyUser = TryCatch(async (req, res) => {
//   const { token } = req.params;

//   if (!token) {
//     return res.status(400).json({
//       message: "Varification token is required.",
//     });
//   }

//   const verifyKey = `verify:${token}`;

//   const userDataJson = await redisClient.get(verifyKey);

//   if (!userDataJson) {
//     return res.status(400).json({
//       message: "Verification LINK is expired.",
//     });
//   }

//   await redisClient.del(verifyKey);

//   const userData = JSON.parse(userDataJson);

//  ///////// Check if user already exists
//   const existingUser = await User.findOne({ email });
//   if (existingUser) {
//     // If this is NOT null, the user exists
//     return res.status(400).json({
//       message: "User already exists with this email",
//     });
//   }

//   const newUser = awaitUser.create({
//     name: userData.name,
//     email: userData.email,
//     password: userData.password,
//   });

//   res.status(201).json({
//     message: " Email verified successfully! your account has been created.",
//     user:{_id:newUser._id, name: newUser.name, email: newUser.email},
//   });

// });

export const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      message: "Verification token is required.",
    });
  }

  const verifyKey = `verify:${token}`;
  const userDataJson = await redisClient.get(verifyKey);

  if (!userDataJson) {
    return res.status(400).json({
      message: "Verification LINK is expired.",
    });
  }

  // 1. Parse the data first
  const userData = JSON.parse(userDataJson);
  const { name, email, password } = userData; // Now 'email' is defined!

  // 2. Check if user already exists using the extracted email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    await redisClient.del(verifyKey); // Clean up Redis
    return res.status(400).json({
      message: "User already exists with this email",
    });
  }

  // 3. Create the user (Also fixed a typo: awaitUser -> User)
  const newUser = await User.create({
    name,
    email,
    password,
  });

  // 4. Delete the token after successful registration
  await redisClient.del(verifyKey);

  res.status(201).json({
    message: "Email verified successfully! Your account has been created.",
    user: { _id: newUser._id, name: newUser.name, email: newUser.email },
  });
});

/////////////////////////////////// LOGIN USER - zod , trycatch , validation , ratelimiting
export const loginUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = LoginSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "Validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "validation error",
        code: issue.code || "validation_error",
      }));
      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  ///// If validation is successful, you can access the validated data using validation.data
  const { email, password } = validation.data;

  ////rateLimit
  const rateLimitKey = `login-rate-limit:${req.ip}:${email}`;

  if (await redisClient.get(rateLimitKey)) {
    return res.status(429).json({
      message: "Too many login attempts. Please try again later.",
    });
  }

  /////////              /find user email if already exists....
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "Invalid credentials",
    });
  }

  /////compare user pass...
  const comparePassword = await bcrypt.compare(password, user.password);

  if (!comparePassword) {
    return res.status(400).json({
      message: "Invalid credentials",
    });
  }

  //// create otp in random number

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpKey = `otp:${email}`;
  await redisClient.set(otpKey, JSON.stringify(otp), {
    EX: 300,
  });

  const subject = "OTP for verification ";

  const html = getOtpHtml({ email, otp });

  await sendMail(email, subject, html);
  await redisClient.set(rateLimitKey, "true", {
    EX: 60,
  });

  res.json({
    message:
      "If your email is valid , an otp has been sent. it will be valid for 5 min ",
  });
});

//////////////////          verify OTP

export const verifyOtp = TryCatch(async (req, res) => {
  let { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      message: "Please provide all details",
    });
  }

  const otpKey = `otp:${email}`;
  const storedOtpString = await redisClient.get(otpKey);

  if (!storedOtpString) {
    return res.status(400).json({
      message: "otp expired",
    });
  }

  const storedOtp = JSON.parse(storedOtpString);

  if (String(storedOtp) !== String(otp)) {
    return res.status(400).json({
      message: "Invalid OTP",
    });
  }

  /////////////////////       delete otp form redisClient side
  await redisClient.del(otpKey);

  let user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }


  const tokenData = await generateToken(user._id, res);
  res.status(200).json({
    message: `Welcome ${user.name}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
    sessionInfo:{
      sessionId: tokenData.sessionId,
      loginTime: new Date().toISOString(),
      csrfToken: tokenData.csrfToken,
    }
  });
});



/////////////////////////////////////////       my Profile

export const myProfile = TryCatch(async(req, res ) => {
  const user = req.user;

  const sessionId = req.sessionId;
  const sessionData = await redisClient.get(`session:${sessionId}`);

  let sessionInfo = null;

  if(sessionData){
    const parsedSession = JSON.parse(sessionData)
    sessionInfo = {
      sessionId,
      loginTime: parsedSession.createdAt,
      lastActivity : parsedSession.lastActivity,
    };
  }

 res.json({ user, sessionInfo });
});


///////////////////////////          refresh TOKEN 

export const refreshToken = TryCatch(async(req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if(!refreshToken) {
    return res.status(401).json({
      message:"Invalid refresh token",
    });
  }

  const decode = await verifyRefreshToken(refreshToken);

  if(!decode) {
    res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");

    return res.status(400).json({
      message:"Session Expired. Please Login",
    });
  }

  generateAccessToken(decode.id, decode.sessionId , res);
  res.status(200).json({
    message:"Token Refreshed",
  });
  
});


///////////////////////////////        logout user     
export const logoutUser = TryCatch(async(req,res) => {
  const userId = req.user._id;

  await revokeRefreshToken(userId);

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");

if (redisClient) await redisClient.del(`user:${userId.toString()}`);

  res.json({
    message:"Logged out successfully",
  });
});

//////////////////////////////////////   
export const refreshCSRF = TryCatch(async(req, res) =>{
  const userId = req.user._id;

  const newCSRFToken = await generateCSRFToken(userId , res);

  res.json({
    message:"CSRF Token refreshed successfully!",
    csrfToken: newCSRFToken,
  });
});




//////////////////// admin user

export const adminController = TryCatch(async(req, res) => {
  res.json({
    message:"Hello admin",
  })
})