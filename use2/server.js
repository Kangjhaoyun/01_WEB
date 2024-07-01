const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const sha = require('sha256');
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');
const app = express();

// MySQL connection setup
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'workshop_0628'
});

connection.connect(err => {
  if (err) throw err;
  console.log('MySQL connected...');
});

app.use(express.static("public")); // Static middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images');
  },
  filename: (req, file, cb) => {
    cb(null, 'homepage_photo' + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(
  session({
    secret: "암호화키",
    resave: false,
    saveUninitialized: false,
  })
);

app.get("/book", function (req, res) {
  res.send("도서 목록 관련 페이지입니다.");
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    res.render("/index.ejs", { user: req.session.user });
  } else {
    res.render("login.ejs");
  }
});

app.post("/login", (req, res) => {
  const { userid, userpw } = req.body;
  connection.query('SELECT * FROM Users WHERE userid = ? AND userpw = ?', [userid, sha(userpw)], (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      req.session.user = rows[0];
      res.render("index.ejs", { user: req.session.user });
    } else {
      res.render("login.ejs");
    }
  });
});

app.get("/bank", (req, res) => {
  if (req.session.user) {
    res.send(`${req.session.user.userid}님 자산 현황`);
  } else {
    res.send("로그인부터 해주세요");
  }
});

app.post("/logout", (req, res) => {
  console.log("로그아웃");
  req.session.destroy();
  res.redirect("/");
});

app.get("/", function (req, res) {
  if (req.session.user) {
    res.render("index.ejs", { user: req.session.user });
  } else {
    res.render("index.ejs", { user: null });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs');
});

app.post('/signup', (req, res) => {
  const newUser = { 
    userid: req.body.userid, 
    userpw: sha(req.body.userpw), 
    username: req.body.username,
    ssn: req.body.ssn,
    phone: req.body.phone,
    useremail: req.body.useremail,
    address: req.body.address
  };
  connection.query('INSERT INTO Users SET ?', newUser, (err, result) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.get('/profile', (req, res) => {
  if (req.session.user) {
    connection.query('SELECT * FROM Users WHERE userid = ?', [req.session.user.userid], (err, rows) => {
      if (err) throw err;
      if (rows.length > 0) {
        res.render('profile.ejs', { user: rows[0] });
      } else {
        res.redirect('/login');
      }
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/profile/edit', (req, res) => {
  if (req.session.user) {
    const updatedUser = { 
      username: req.body.username,
      ssn: req.body.ssn,
      phone: req.body.phone,
      useremail: req.body.useremail,
      address: req.body.address
    };
    connection.query('UPDATE Users SET ? WHERE userid = ?', [updatedUser, req.session.user.userid], (err, result) => {
      if (err) throw err;
      res.redirect('/profile');
    });
  } else {
    res.redirect('/login');
  }
});

// Route to render the transactions page with history
app.get('/transactions', (req, res) => {
  if (req.session.user) {
    connection.query('SELECT * FROM Users WHERE userid = ?', [req.session.user.userid], (err, userRows) => {
      if (err) throw err;
      if (userRows.length > 0) {
        connection.query('SELECT * FROM Accounts WHERE userid = ? ORDER BY date DESC', [req.session.user.userid], (err, transactions) => {
          if (err) throw err;
          res.render('transactions.ejs', { user: userRows[0], transactions });
        });
      } else {
        res.redirect('/login');
      }
    });
  } else {
    res.redirect('/login');
  }
});

// Route to handle deposit
app.post('/transactions/deposit', (req, res) => {
  if (req.session.user) {
    const amount = parseFloat(req.body.amount);
    if (amount && amount > 0) {
      connection.query('UPDATE Users SET balance = balance + ? WHERE userid = ?', [amount, req.session.user.userid], (err, result) => {
        if (err) throw err;
        const transaction = { userid: req.session.user.userid, type: 'deposit', amount, date: new Date() };
        connection.query('INSERT INTO Accounts SET ?', transaction, (err, result) => {
          if (err) throw err;
          res.redirect('/transactions');
        });
      });
    } else {
      res.redirect('/transactions');
    }
  } else {
    res.redirect('/login');
  }
});

// Route to handle withdrawal
app.post('/transactions/withdraw', (req, res) => {
  if (req.session.user) {
    const amount = parseFloat(req.body.amount);
    if (amount && amount > 0) {
      connection.query('SELECT balance FROM Users WHERE userid = ?', [req.session.user.userid], (err, rows) => {
        if (err) throw err;
        if (rows[0].balance >= amount) {
          connection.query('UPDATE Users SET balance = balance - ? WHERE userid = ?', [amount, req.session.user.userid], (err, result) => {
            if (err) throw err;
            const transaction = { userid: req.session.user.userid, type: 'withdraw', amount, date: new Date() };
            connection.query('INSERT INTO Accounts SET ?', transaction, (err, result) => {
              if (err) throw err;
              res.redirect('/transactions');
            });
          });
        } else {
          res.redirect('/transactions');
        }
      });
    } else {
      res.redirect('/transactions');
    }
  } else {
    res.redirect('/login');
  }
});

// Route to handle file upload
app.post('/upload', upload.single('photo'), (req, res) => {
  res.redirect('/');
});

app.listen(8080, function () {
  console.log("포트 8080으로 서버 대기중 ... ");
});


// const mongoclient = require("mongodb").MongoClient;
// const ObjId = require("mongodb").ObjectId;
// const url = `mongodb+srv://admin:1234@cluster0.87qpxb1.mongodb.net/?retryWrites=true&w=majority&appName=cluster0`;

// let mydb;
// mongoclient
//   .connect(url)
//   .then((client) => {
//     mydb = client.db("workshop_0628"); // Changed database name
//     console.log("mongodb ok ");
//     app.listen(8080, function () {
//       console.log("포트 8080으로 서버 대기중 ... ");
//     });
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// const express = require("express");
// const app = express();

// app.use(express.static("public")); //static 미들웨어 설정

// //body-parser 라이브러리 추가
// const bodyParser = require("body-parser");
// app.use(bodyParser.urlencoded({ extended: true }));
// app.set("view engine", "ejs");

// const session = require("express-session");
// app.use(
//   session({
//     secret: "암호화키",
//     resave: false,
//     saveUninitialized: false,
//   })
// );

// app.get("/login", (req, res) => {
//   if (req.session.user) {
//     res.render("/index.ejs", { user: req.session.user });
//   } else {
//     res.render("login.ejs");
//   }
// });

// app.post("/login", (req, res) => {
//   mydb
//     .collection("Users")
//     .findOne({ userid: req.body.userid })
//     .then((result) => {
//       if (result != null && result.userpw == req.body.userpw) {
//         req.session.user = req.body;
//         console.log("새로운 로그인");
//         res.render("index.ejs", { user: req.session.user });
//       } else {
//         res.render("login.ejs");
//       }
//     })
//     .catch((err) => {
//       console.log(err);
//       res.status(500).send();
//     });
// });

// app.get("/logout", (req, res) => {
//   console.log("로그아웃");
//   req.session.destroy();
//   res.render("index.ejs", { user: null });
// });

// app.get("/", function (req, res) {
//   if (req.session.user) {
//     res.render("index.ejs", { user: req.session.user });
//   } else {
//     res.render("index.ejs", { user: null });
//   }
// });

// app.get('/signup', (req, res) => {
//   res.render('signup.ejs');
// })

// const sha = require('sha256');
// app.post('/signup', (req, res) => {
//   console.log(req.body);
//   console.log(sha(req.body.userpw));
//   req.body.userpw = sha(req.body.userpw);

//   mydb.collection('Users')
//     .insertOne(req.body)
//     .then(result => {
//       console.log('회원가입 성공');
//     })
//     .catch(err => {
//       console.log(err);
//     });

//   res.redirect('/');
// });

// app.get('/profile', (req, res) => {
//   if (req.session.user) {
//     mydb.collection('Users')
//       .findOne({ userid: req.session.user.userid })
//       .then(result => {
//         if (result) {
//           res.render('profile.ejs', { user: result });
//         } else {
//           res.redirect('/login');
//         }
//       })
//       .catch(err => {
//         console.log(err);
//         res.status(500).send('Error fetching profile information');
//       });
//   } else {
//     res.redirect('/login');
//   }
// });

// app.post('/profile/edit', (req, res) => {
//   if (req.session.user) {
//     mydb.collection('Users')
//       .updateOne(
//         { userid: req.session.user.userid },
//         {
//           $set: {
//             username: req.body.username,
//             ssn: req.body.ssn,
//             phone: req.body.phone,
//             useremail: req.body.useremail,
//             address: req.body.address
//           }
//         }
//       )
//       .then(result => {
//         res.redirect('/profile');
//       })
//       .catch(err => {
//         console.log(err);
//         res.status(500).send('Error updating profile information');
//       });
//   } else {
//     res.redirect('/login');
//   }
// });

// // Add these routes to server.js

// // Route to render the transactions page with history
// app.get('/transactions', (req, res) => {
//   if (req.session.user) {
//     mydb.collection('Users')
//       .findOne({ userid: req.session.user.userid })
//       .then(user => {
//         if (user) {
//           return mydb.collection('Accounts')
//             .find({ userid: req.session.user.userid })
//             .sort({ date: -1 })
//             .toArray()
//             .then(transactions => {
//               res.render('transactions.ejs', { user, transactions });
//             });
//         } else {
//           res.redirect('/login');
//         }
//       })
//       .catch(err => {
//         console.log(err);
//         res.status(500).send('Error fetching transaction information');
//       });
//   } else {
//     res.redirect('/login');
//   }
// });

// // Route to handle deposit
// app.post('/transactions/deposit', (req, res) => {
//   if (req.session.user) {
//     const amount = parseFloat(req.body.amount);
//     if (amount && amount > 0) {
//       mydb.collection('Users')
//         .updateOne(
//           { userid: req.session.user.userid },
//           { $inc: { balance: amount } }
//         )
//         .then(() => {
//           return mydb.collection('Accounts').insertOne({
//             userid: req.session.user.userid,
//             type: 'deposit',
//             amount,
//             date: new Date()
//           });
//         })
//         .then(() => {
//           res.redirect('/transactions');
//         })
//         .catch(err => {
//           console.log(err);
//           res.status(500).send('Error processing deposit');
//         });
//     } else {
//       res.redirect('/transactions');
//     }
//   } else {
//     res.redirect('/login');
//   }
// });

// // Route to handle withdrawal
// app.post('/transactions/withdraw', (req, res) => {
//   if (req.session.user) {
//     const amount = parseFloat(req.body.amount);
//     if (amount && amount > 0) {
//       mydb.collection('Users')
//         .findOne({ userid: req.session.user.userid })
//         .then(user => {
//           if (user.balance >= amount) {
//             return mydb.collection('Users')
//               .updateOne(
//                 { userid: req.session.user.userid },
//                 { $inc: { balance: -amount } }
//               );
//           } else {
//             throw new Error('Insufficient balance');
//           }
//         })
//         .then(() => {
//           return mydb.collection('Accounts').insertOne({
//             userid: req.session.user.userid,
//             type: 'withdraw',
//             amount,
//             date: new Date()
//           });
//         })
//         .then(() => {
//           res.redirect('/transactions');
//         })
//         .catch(err => {
//           console.log(err);
//           res.status(500).send('Error processing withdrawal');
//         });
//     } else {
//       res.redirect('/transactions');
//     }
//   } else {
//     res.redirect('/login');
//   }
// });
