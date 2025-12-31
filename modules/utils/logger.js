const fs = require('fs').promises;
const path = require('path');

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = logLevels[process.env.LOG_LEVEL] || logLevels.info;

class Logger {
    constructor() {
        this.logFile = path.join(__dirname, '../../logs/bot.log');
        this.initLogFile();
    }

    async initLogFile() {
        try {
            const dir = path.dirname(this.logFile);
            await fs.mkdir(dir, { recursive: true });
        } catch (e) {
            console.error('failed to create log directory:', e.message);
        }
    }

    async writeToFile(level, message) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
            await fs.appendFile(this.logFile, logEntry);
        } catch (e) {
            // fail silently
        }
    }

    format(...args) {
        return args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
    }

    error(...args) {
        const message = this.format(...args);
        console.error(message);
        this.writeToFile('error', message);
    }

    warn(...args) {
        if (currentLevel >= logLevels.warn) {
            const message = this.format(...args);
            console.warn(message);
            this.writeToFile('warn', message);
        }
    }

    info(...args) {
        if (currentLevel >= logLevels.info) {
            const message = this.format(...args);
            console.log(message);
            this.writeToFile('info', message);
        }
    }

    debug(...args) {
        if (currentLevel >= logLevels.debug) {
            const message = this.format(...args);
            console.log('[DEBUG]', message);
            this.writeToFile('debug', message);
        }
    }
}

module.exports = new Logger();
