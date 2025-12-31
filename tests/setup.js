process.env.NODE_ENV = 'test';
process.env.PAGE_ACCESS_TOKEN = 'test_token';
process.env.VERIFY_TOKEN = 'test_verify';

global.logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
};

global.PAGE_ACCESS_TOKEN = 'test_token';
console.log("Test environment configured.");
