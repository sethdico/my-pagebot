# amduspage

![NodeJS](https://img.shields.io/badge/node.js-black?style=flat-square&logo=nodedotjs) ![MongoDB](https://img.shields.io/badge/mongodb-black?style=flat-square&logo=mongodb)

optimized messenger pagebot. runs on nodejs.
simple. fast. secure.

**maker**
[seth asher salinguhay](https://www.facebook.com/seth09asher)
[github/sethdico](https://github.com/sethdico)

---

## structure

- `modules/scripts/commands` — bot logic
- `page/src` — facebook api wrappers
- `config/` — api endpoints & settings
- `index.js` — main entry point

---

## setup

**1. basic config**
fill `config.json` with your prefix and bot name.

**2. environment variables**
set these in your host (Render/Railway/Replit):

| variable | description |
| :--- | :--- |
| `PAGE_ACCESS_TOKEN` | facebook page token |
| `VERIFY_TOKEN` | webhook verification |
| `ADMINS` | your id (separated by comma) |
| `MONGODB_URI` | mongodb connection string |
| `DICT_API_KEY` | merriam-webster key |
| `CHIPP_API_KEY` | ai chat key |
| `APY_TOKEN` | tempmail api key |
| `GOOGLE_API_KEY` | google search api |
| `GOOGLE_CX` | google search engine id |
| `NASA_API_KEY` | nasa photos |
| `WOLFRAM_APP_ID` | wolfram alpha id |

---

## deployment

**build command**
```bash
npm install
```

**start command**
```bash
node index.js
```

---

## admin commands

`stats` — check ram, uptime, and user count.
`uid` — get your id and db info.
`ban <id> <reason>` — block a user.
`unban <id>` — unblock a user.
`broadcast <msg>` — send announcement to all users.
`maintenance on/off` — toggle bot availability.
`clean` — purge old cache files.

---

made by sethdico.
