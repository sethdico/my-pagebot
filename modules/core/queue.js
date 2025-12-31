class Queue {
    constructor(concurrency = 1, interval = 0) {
        this.queue = [];
        this.processing = 0;
        this.concurrency = concurrency;
        this.interval = interval;
        this.lastProcess = 0;
    }

    add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }

    process() {
        if (this.processing >= this.concurrency || this.queue.length === 0) return;

        const now = Date.now();
        const timeSinceLast = now - this.lastProcess;

        if (timeSinceLast < this.interval) {
            setTimeout(() => this.process(), this.interval - timeSinceLast);
            return;
        }

        this.processing++;
        this.lastProcess = now;
        const { fn, resolve, reject } = this.queue.shift();

        Promise.resolve(fn())
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.processing--;
                this.process();
            });
    }
}

module.exports = Queue;
