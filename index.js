import express from "express";
import axios from "axios";
import helmet from "helmet";
import "dotenv/config";
import cron from "node-cron";
import fetch from "node-fetch";

if (process.env.MAL_CLIENT_ID == undefined) {
  console.log("Please set the environment variables");
  process.exit(1);
}

const app = express();
const port = 3000;
const DISP_LIMIT = 1;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(helmet.hidePoweredBy());

var list = [];
const MAL_URL = "https://api.myanimelist.net/v2/";
const MAL_LIMIT = process.env.MAL_LIMIT || 1000;
const MAL_PTW_EXT = `/animelist?status=plan_to_watch&limit=${MAL_LIMIT}`;
const MAL_FIELDS =
  "?fields=id,title,num_episodes,main_picture,synopsis,mean,status,genres";
const MAL_HEADER = {
  headers: {
    "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID,
  },
};

const GITHUB_CONTRIBUTIONS_URL = process.env.GITHUB_CONTRIBUTIONS_URL;
const GITHUB_AUTH_HEADER = {
  headers: {
    Authorization: `token  ${process.env.GITHUB_TOKEN}`,
  },
};

app.get("/", async (req, res) => {
  if (list.length != 0) {
    const random = Math.floor(Math.random() * list.length);
    const response = await axios.get(
      MAL_URL + "anime/" + list[random].id + MAL_FIELDS,
      MAL_HEADER,
    );
    res.render("index.ejs", {
      data: response.data,
      limit: DISP_LIMIT,
      err: null,
    });
    list = [];
  } else {
    res.render("index.ejs", { data: null, err: null });
  }
});
app.get("/about", async (req, res) => {
  try {
    res.render('about.ejs',{ data:{page:'about'},err:null});
    console.log("About page visited");
  } catch (error) {
    res.render("index.ejs", {data:null,err:"Error"})
  } 
});
app.post("/", async (req, res) => {
  console.log(req.body);
  const username = req.body.mal;
  const url = MAL_URL + "users/" + username + MAL_PTW_EXT;
  const response = await axios.get(url, MAL_HEADER).catch((err) => {
    console.log(err.status + " " + err.response.data.message);
    res.render("index.ejs", { data: null, err: err.toJSON() });
  });
  if (response) {
    const data = response.data.data;
    for (var i = 0; i < data.length; i++) {
      list.push(data[i].node);
    }
    res.redirect("/");
  }
});

app.get("/contributors", async (req, res) => {
  try {
    const { data } = await axios.get(
      GITHUB_CONTRIBUTIONS_URL,
      GITHUB_AUTH_HEADER,
    );
    res.render("contributors.ejs", { data: data });
  } catch (error) {
    console.log(error.status + " " + error.response.data.message);
    return res.render("404.ejs", { data: null });
  }
});

app.get("/healthcheck", (req, res) => {
  res.json({ message: "I am healthy" });
});

cron.schedule("*/5 * * * *", async () => {
  const url = process.env.PUBLIC_URL || `http://localhost:${port}`;
  try {
    const response = await fetch(`${url}/healthcheck`);
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
});

// For Handling 404
app.use((req, res) => {
  res.status(404).render("404.ejs", { data:null});
});

app.listen(port, () => {
  console.log(`Server started at port ${port}`);
});
