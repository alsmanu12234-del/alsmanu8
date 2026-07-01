/**
 * engine/queue.mjs
 * ─────────────────────────────────────────────────────────────────
 * المسؤولية: تنفيذ العمليات الثقيلة بشكل متدرج لمنع التزاحم.
 *
 * ميزات:
 *  • تحديد الحد الأقصى للعمليات المتزامنة
 *  • إعادة المحاولة عند الفشل (اختياري)
 *  • إيقاف مؤقت واستئناف
 *  • إحصائيات تفصيلية
 *
 * تعتمد على: لا شيء (وحدة خالصة)
 * Exports: Queue
 */

export class Queue {
  /** @type {Array<QueueItem>} */
  #pending = [];
  #running = 0;
  #paused  = false;
  #stats   = { processed: 0, failed: 0, retried: 0 };

  /**
   * @param {object} [options]
   * @param {number} [options.maxConcurrent=1] — الحد الأقصى للعمليات المتزامنة
   * @param {number} [options.maxRetries=0]    — عدد مرات إعادة المحاولة عند الفشل
   * @param {number} [options.retryDelay=1000] — تأخير إعادة المحاولة بالمللي ثانية
   */
  constructor({ maxConcurrent = 1, maxRetries = 0, retryDelay = 1000 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.maxRetries    = maxRetries;
    this.retryDelay    = retryDelay;
  }

  /**
   * يضيف عملية إلى الطابور.
   * @param {string} label — اسم العملية (للسجلات)
   * @param {Function} fn  — دالة async تُنفَّذ
   * @param {number} [priority=0] — أعلى = أسرع تنفيذاً
   * @returns {Promise<*>}
   */
  push(label, fn, priority = 0) {
    return new Promise((resolve, reject) => {
      const item = { label, fn, priority, resolve, reject, attempts: 0 };
      // إدراج حسب الأولوية (الأعلى أولاً)
      const idx = this.#pending.findLastIndex(p => p.priority >= priority);
      this.#pending.splice(idx + 1, 0, item);
      this.#tick();
    });
  }

  /** يوقف تنفيذ العمليات الجديدة (لا يوقف المنفَّذة حالياً). */
  pause() {
    this.#paused = true;
  }

  /** يستأنف التنفيذ. */
  resume() {
    this.#paused = false;
    this.#tick();
  }

  /** @returns {{ pending: number, running: number, processed: number, failed: number }} */
  getStats() {
    return {
      pending:   this.#pending.length,
      running:   this.#running,
      ...this.#stats,
    };
  }

  /** يُفرِّغ الطابور (لا يُلغي العمليات الجارية). */
  clear() {
    const cancelled = this.#pending.splice(0);
    for (const item of cancelled) {
      item.reject(new Error(`Queue cleared — cancelled: ${item.label}`));
    }
  }

  // ── داخلي ──────────────────────────────────────────────────────
  #tick() {
    if (this.#paused) return;
    while (this.#running < this.maxConcurrent && this.#pending.length > 0) {
      const item = this.#pending.shift();
      this.#execute(item);
    }
  }

  async #execute(item) {
    this.#running++;
    item.attempts++;
    try {
      const result = await item.fn();
      this.#stats.processed++;
      item.resolve(result);
    } catch (e) {
      if (item.attempts <= this.maxRetries) {
        this.#stats.retried++;
        await this.#sleep(this.retryDelay * item.attempts);
        this.#pending.unshift(item); // أولوية قصوى لإعادة المحاولة
      } else {
        this.#stats.failed++;
        item.reject(e);
      }
    } finally {
      this.#running--;
      this.#tick();
    }
  }

  #sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
