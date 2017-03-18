const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const request = require("request");
const bcrypt = require("bcrypt");

app.use(cookieSession({
  name: 'session',
  keys: ['light', 'house']
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('images'));
app.set("view engine", "ejs");

const port = process.env.PORT || 8080;
let shortURL = '';
let longURL = '';

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "password"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "password2"
  },
  "user3RandomID": {
    id: "user3RandomID",
    email: "user3@example.com",
    password: "password3"
  },
  "user4RandomID": {
    id: "user4RandomID",
    email: "user4@example.com",
    password: "password4"
  }
}

var urlDatabase = {
  "userRandomID": {
    "b2xVn2": "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
  }
};

//when hitting root, redirect to login page.
app.get("/", (req, res) => {
  res.redirect("/login");
});

//renders registration page
app.get("/register", (req, res) => {
  res.render("urls_register");
});

//registers the user - logic
app.post("/register", (req, res) => {
  let flag=true;
  if(!req.body.email || !req.body.password){
    res.statusCode=400;
    res.render("urls_error", {statusCode: 400, statusMessage : "Email and Password fileds cannot be empty", urlText: "Try again!", urlPath: "/login"});
  }
  else{
    for (let key in users){
      if (users[key].email === req.body.email){
        flag=false;
        res.render("urls_error", {statusCode: 400, statusMessage : "Email Id already exists.", urlText: "Login here!", urlPath: "/login"});
        break;
      }
    }
    while (flag){
      let id = generateRandomString();
      if(!users[id]){
        users[id] = {};
        users[id]["id"] = id;
        users[id]["email"] = req.body.email;
        users[id]["password"] = bcrypt.hashSync(req.body.password, 10);
        req.session.user_id = id;
        res.redirect("/urls");
        break;
      }
    }
  }

});

//get requet to /login
app.get("/login", (req, res) => {
  if(req.session.user_id){
    res.redirect("/urls");
  } else {
  res.render('urls_login');
  }
});

//sets the cookie when login happens
app.post("/login", (req, res) => {
  let found =false;
  for (key in users){
    if(users[key].email === req.body.email){
      if (bcrypt.compareSync(req.body.password, users[key].password)){
        found = true;
        req.session.user_id = users[key].id;
        res.redirect('/urls');
        break;
      } else {
        res.render("urls_error", {statusCode:403, statusMessage:"Incorrect Password.", urlText: "Try again!", urlPath: "/login"});
        break;
      }
    }
  }
  if(!found){
    res.render("urls_error", {statusCode:403, statusMessage: "TinyApp doesn't recognize the email Id.", urlText: "Register here!", urlPath: "/register"});
  }
});

//homepage of the web-site
app.get("/urls", (req, res) => {
  if(req.session.user_id) {
    res.render('urls_index', {
      user : users[req.session.user_id],
      urls : urlDatabase[req.session.user_id]
    });
  } else {
      res.redirect("/login");
  }
});

//add short and long URL logic
app.post("/urls", (req, res) => {
  let id = req.session.user_id;
  longURL = req.body.longURL;
  if(!urlDatabase[id]){
    urlDatabase[id]={};
  }
  while(true){
    shortURL = generateRandomString();
    if (!urlDatabase[id][shortURL]) {
      urlDatabase[id][shortURL] = longURL;
      break;
    }
  }
  //console.log(urlDatabase);
  res.redirect("/urls")
});

//redirect to the original page
app.get("/u/:shortURL", (req, res) => {
  request.get(longURL, (error, response) => {
    if (error){
      res.statusCode = 404;
      res.contentType = "text/plain";
      res.send("<html><body><h3> The page you requested does not exist.  Enter a valid URL.</p></body></html>");
    }
    else if (response.statusCode === 200){
      res.statusCode = 302;
      res.redirect(longURL);
    } else {
      res.statusCode = 404;
      res.contentType = "text/plain";
      res.send("<html><body><h3> The page you requested does not exist.  Enter a valid URL.</p></body></html>");
    }

  });
});

//page that allows to add new URL
app.get("/urls/new", (req, res) => {
  if (req.session.user_id)
    res.render("urls_new", {user : users[req.session.user_id]})
  else
    res.redirect("/login");
});

// Update URL Page
app.get("/urls/:id", (req, res) => {
  res.render('urls_show', {
    user: users[req.session.user_id],
    shortURL : req.params.id,
    longURL : urlDatabase[req.session.user_id][req.params.id]
  });
});

//update URL logic
app.post("/urls/:id", (req,res) => {
  urlDatabase[req.session.user_id][req.params.id] = req.body.longURL;
  res.redirect("/urls");
});

//delete the URL
app.post("/urls/:id/delete", (req,res) => {
  delete urlDatabase[req.session.user_id][req.params.id];
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

let generateRandomString = () => {
  let input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz';
  let randomString = ''
  for (let i = 0; i < 6; i++){
    randomString += input[Math.round(Math.random() * 100) % 62];
  }
  return randomString;
}