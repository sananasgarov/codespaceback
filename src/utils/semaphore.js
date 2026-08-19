// Minimal counting semaphore, equivalent to java.util.concurrent.Semaphore
// used by DockerService.java to cap concurrent container executions.
class Semaphore {
  constructor(permits) {
    this.available = permits;
    this.queue = [];
  }

  /**
   * Try to acquire a permit, waiting up to `timeoutMs`.
   * @returns {Promise<boolean>} true if acquired, false on timeout.
   */
  tryAcquire(timeoutMs) {
    if (this.available > 0) {
      this.available -= 1;
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const entry = { resolve, timedOut: false };

      const timer = setTimeout(() => {
        entry.timedOut = true;
        const idx = this.queue.indexOf(entry);
        if (idx !== -1) this.queue.splice(idx, 1);
        resolve(false);
      }, timeoutMs);

      entry.timer = timer;
      this.queue.push(entry);
    });
  }

  release() {
    const next = this.queue.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve(true);
    } else {
      this.available += 1;
    }
  }

  availablePermits() {
    return this.available;
  }
}

module.exports = Semaphore;
