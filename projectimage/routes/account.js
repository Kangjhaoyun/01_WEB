const router = require("express").Router();
const setup = require("../db_setup");
const sha = require("sha256");

///////// 로그아웃 처리
router.get("/account/logout", (req, res) => {
  console.log("logout ok");
  req.session.destroy();
  res.render("index.ejs");
});

///////// 로그인 처리
router.post("/account/login", async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  mongodb
    .collection("account")
    .findOne({ userid: req.body.userid })
    .then((result) => {
      if (result) {
        const sql = `SELECT salt FROM UserSalt 
                    WHERE userid=?`;
        mysqldb.query(sql, [req.body.userid], (err, rows, fields) => {
          if (err) {
            res.render("index.ejs", { data: { alertMsg: '다시 로그인 해주세요' } });
            return;
          }
          try {
            const salt = rows[0].salt;
            const hashPw = sha(req.body.userpw + salt);
            //  console.log(hashPw);
            if (result.userpw == hashPw) {
              req.body.userpw = hashPw;
              req.session.user = req.body;
              console.log('login ok');
              res.cookie("uid", req.body.userid);
              res.render("index.ejs");
            } else {
              res.render("index.ejs", { data: { alertMsg: '다시 로그인 해주세요' } });
            }
          } catch (err) {
            res.render("index.ejs", {data:{alertMsg:'다시 로그인 해주세요'}});
          }
        });
      } else {
        res.render("index.ejs", {data:{alertMsg:'다시 로그인 해주세요'}});
      }
    })
    .catch((err) => {
      res.render("index.ejs", {data:{alertMsg:'다시 로그인 해주세요'}});
    });
});

////////// 회원 가입 처리
router.post("/account/save", async (req, res) => {
  const { mongodb, mysqldb } = await setup();
  mongodb
    .collection("account")
    .findOne({ userid: req.body.userid })
    .then((result) => {
      if (result) {
        res.render("account/enter.ejs", { data: { msg: "ID가 중복되었습니다" } });
      } else {
        const generateSalt = (length = 16) => {
          const crypto = require("crypto");
          return crypto.randomBytes(length).toString("hex");
        };

        const salt = generateSalt();
        req.body.userpw = sha(req.body.userpw + salt);
        mongodb
          .collection("account")
          .insertOne(req.body)
          .then((result) => {
            if (result) {
              console.log("회원가입 성공");

              //MySQL에 salt를 저장
              const sql = `INSERT INTO UserSalt (userid, salt)
                    VALUES (?,?)`;
              mysqldb.query(sql, [req.body.userid, salt], (err, result2) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("salt 저장 성공");
                }
              });
              res.redirect("/");
            } else {
              console.log("회원가입 fail");
              res.render("account/enter.ejs", { data: { alertMsg: "회원가입 fail" } });
            }
          })
          .catch((err) => {
            console.log(err);
            res.status(500).send();
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

////////// 회원 가입 화면
router.get("/account/enter", (req, res) => {
  res.render("account/enter.ejs");
});

module.exports = router;


