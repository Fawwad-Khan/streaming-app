const express = require("express");
const app = express();
const fs = require("fs");

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

// more code will go in here just befor the listening function

app.get("/video", function (req, res) {
  res.sendFile(__dirname + "/watcher.html");
});

app.listen(8000, function () {
  console.log("Listening on port 8000!");
});
