code
Markdown
# amduspage

simple facebook messenger bot. runs on nodejs.

## structure
- modules/scripts/commands: bot commands
- page/src: api wrappers
- index.js: main entry point
- launcher.js: auto-restart script
- config.json: credentials

## setup
1. fill `config.json` with your keys:
```json
{
  "PAGE_ACCESS_TOKEN": "...",
  "VERIFY_TOKEN": "...",
  "PREFIX": "/",
  "ADMINS": ["your_uid"],
  "API_VERSION": "v21.0"
}
'''

deployment
build command: npm install
start command: node launcher.js
env vars: set PAGE_ACCESS_TOKEN and CHIPP_API_KEY if needed

admin
uid: get your id
ban <id>: block a user
unban <id>: unblock a user
broadcast <msg>: send announcement to active users

made by sethdico.
