const https = require('https');
const fs = require('fs');

const express = require('express');
const app = express();

const options = {
    key: fs.readFileSync('server.key'),
    cert:fs.readFileSync('server.cert')
}


const url = `mongodb+srv://admin:1234@cluster0.jjdzoie.mongodb.net/
?retryWrites=true&w=majority&appName=Cluster0`;

let mydb;
const mongoclient = require("mongodb").MongoClient;
mongoclient.connect(url)
    .then(client => {
        console.log("몽고DB 접속 성공");
        mydb = client.db('myboard');
        https.createServer(options, app).listen(443, () => {
            console.log('HTTPS Server running on port 443');
        });
    })
    .catch(err => {
        console.log(err);
    });

const session = require('express-session');
app.use(session({
    secret: '암호화키',
    resave: false,
    saveUninitialized:false
}));


//////// passport 등록
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

//////// facebook 인증
const FacebookStrategy = require('passport-facebook');

app.get('/facebook', passport.authenticate('facebook'));

app.get('/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/fail'
}),
(req,res)=>{}
);

passport.use(new FacebookStrategy({
    clientID: '3295343507441975',
    clientSecret: 'e950b0593c8a7044a4bdb4a3e210a60b',
    callbackURL: '/facebook/callback'
}, function (accessToken, refreshToken, profile, done) {
    console.log('2', profile);
    const authkey = 'facebook' + profile.id;
    const authName = profile.displayName;

    mydb.collection('account')
        .findOne({ userkey: authkey })
        .then(result => {
            console.log('3', result);
            if (result != null) {
                console.log("3-1 페이스북 사용자를 우리 DB에서 찾았음");
                done(null, result);
            } else {
                console.log("3-1 페이스북 사용자를 우리 DB에서 못찾았음");
                mydb.collection('account')
                    .insertOne({
                        userkey: authkey,
                        userid:authName
                    })
                    .then(insertResult => {
                        if (insertResult != null) {
                            console.log("3-2 페이스북 사용자를 우리 DB에 저장 완료");
                            mydb.collection('account')
                                .findOne({userkey:authkey})
                                .then(result2 => {
                                    if (result2 != null) {
                                        console.log("3-3 페이스북 사용자를 우리 DB에 저장 후 다시 찾았음");
                                        done(null, result2);
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                });
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });
            }
        })
        .catch(err => {
            console.log(err);
        });
}));
 
passport.serializeUser((user, done) => {
    try {
        console.log('4 serializeUser', user);
        done(null, user);
    } catch (err) {
        console.log(err);
    }
});

passport.deserializeUser((user, done) => {
    console.log("5.deserializeUser");

    mydb
    .collection("account")
    .findOne({ userkey: user.userkey })
    .then((result) => {
      console.log(result);
      done(null, result);
    }); //user는 이미 passport에 있는 객체라서 이렇게 매번 DB에 가서 확인할 필요가 전혀없다!
});

app.get('/', (req, res) => {
    console.log("/ 요청");

    try {
        console.log("1", req.session.passport);
        if (typeof req.session.passport != undefined && req.session.passport.user) {
            res.render("index.ejs", { data: req.session.passport });
        } else {
            res.render('index.ejs', {data:null});
        }        
    } catch (err) {
        console.log('1-1');
        res.render('index.ejs', {data:null});
    }
});

///////// login
app.get("/login", (req, res) => {
    console.log("/login", req.session.passport);
    res.render("login.ejs");
  });