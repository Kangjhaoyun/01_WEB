const dotenv = require("dotenv").config();
const setup = require("./db_setup");
const express = require("express");

const app = express();

app.use(express.static("public")); //static 미들웨어 설정

///////////// session 설정
const session = require("express-session");
app.use(
  session({
    secret: "암호화키",
    resave: false,
    saveUninitialized: false,
  })
);

//////////// cookie 설정
const cookieParser = require("cookie-parser");
app.use(cookieParser());


////////////// body-parser 라이브러리 추가
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));


//라우팅 
app.get("/", (req, res) => {
  res.render("index.ejs");
});
//라우팅 포함하는 코드
app.use('/', require('./routes/account.js')); 
app.use('/', require('./routes/post'));

app.listen(process.env.WEB_PORT, async () => {
  await setup();
  console.log("8080 서버가 준비되었습니다...");
});




















