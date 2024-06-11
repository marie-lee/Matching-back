class Mutex {
    constructor() {
        this.queue = [];
        this.locked = false;
    }

    async lock() {
        return new Promise((resolve, reject) => {
            const acquireLock = async () => {
                if (!this.locked) {
                    this.locked = true;
                    resolve();
                } else {
                    this.queue.push(resolve);
                }
            };

            acquireLock();
        });
    }

    unlock() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        } else {
            this.locked = false;
        }
    }
}

// 모듈 내부에서 싱글톤으로 Mutex 인스턴스 생성
const mutex = new Mutex();

module.exports = mutex;