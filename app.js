require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose = require("mongoose");
const passport=require("passport");
const session=require("express-session");
const passportLocalMongoose=require("passport-local-mongoose");
// const encrypt= require("mongoose-encryption");
// const md5=require("md5");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app=express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
    secret:"Our littke secret.",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());


const uri="mongodb+srv://ankit:kRdvKJhWd2qsQ0GE@cluster0.3sackxo.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(uri,{dbName:"secrets"},function(){
    console.log("Sucessfully connected to database");
})

// mongoose.set("useCreateIndex",true);

const userSchema=new mongoose.Schema({
    email: String,
    password: String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:["password"]})

const User= new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());     will not work in all conditions

//will work in all conditions
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home")

})

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secfrets.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
    res.render("login")
})
app.get("/register",function(req,res){
    res.render("register")
})


app.get("/secrets",function(req,res){
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("/login");
    // }


    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if (err){
          console.log(err);
        } else {
          if (foundUsers) {
            res.render("secrets", {usersWithSecrets: foundUsers});
          }
        }
      });
})
app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
})
app.get("/logout",function(req,res){
    // req.logOut();
    // res.redirect("/");
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})





app.post("/register",function(req,res){
    //using passport

    User.register({username:req.body.username}, req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            })
           
        }
    })
    // const newUser= new User({
    //     email:req.body.username,
    //     password:md5(req.body.password),
    // })

    // newUser.save(function(err){
    //     if(!err){
    //         console.log("user added sucessfully");
    //         res.render("secrets");
    //     }
    // })
})


app.post("/login",function(req,res){
//passport
const user=new User({
    username:req.body.username,
    password:req.body.password
});

req.login(user,function(err){
    if(err){
        console.log(err);
    }else{
        passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets")
        })}
})

app.post("/submit",function(req,res){
    const submittedSecret=req.body.secret;


    User.findById(req.user.id, function(err,foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret=submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
              
            }
        }
    })
})





//     const user=req.body.username;
//     const password=md5(req.body.password);

// User.findOne({email:user},function(err,foundUser){
//     if(err){
//         console.log(err);
//     }else{
//         if(foundUser.password === password){
//             res.render("secrets")
//         }
//     }
//})

})

app.listen(3000,function(){
    console.log("server starred at port 3000");
})