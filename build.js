const fs = require('fs');
const UglifyJS = require("uglify-js");

const header = `(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
    (global.Ws = factory());
}(this, (function () { 'use strict';
`;

const footer = `
return Ws;
})));`;

let core = fs.readFileSync('./src/core.js');
let websocket = fs.readFileSync('./src/websocket.js');
let wechat = fs.readFileSync('./src/wechat.js');
let polling = fs.readFileSync('./src/polling.js');

let builds = {
  ws: polling + "\n" + websocket + "\n" + core,
  wslite: websocket + "\n" + core,
  wews: wechat + "\n" + core
};

let file, data, mini;
console.log("start build");
for (let key in builds) {
  data = header + builds[key] + footer;
  file = "./dist/"+key+".js";
  fs.writeFileSync(file, data);
  console.log(file);

  mini = UglifyJS.minify(data);
  if (!mini.error) {
    file = "./dist/"+key+".min.js";
    fs.writeFileSync(file, mini.code);
    console.log(file);
  }
}





