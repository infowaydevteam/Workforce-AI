const { IDLE_ALERT_SCHEDULER_INTERVAL_MS } = require("./idleAlertConfig");
const { evaluateIdleAlerts } = require("./idleAlertService");

function startIdleAlertScheduler() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await evaluateIdleAlerts();
    } catch (error) {
      console.error("Idle alert scheduler error:", error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, IDLE_ALERT_SCHEDULER_INTERVAL_MS);
  timer.unref?.();
  void tick();
  console.log(`Idle alert scheduler started (${IDLE_ALERT_SCHEDULER_INTERVAL_MS}ms)`);
  return () => clearInterval(timer);
}

module.exports = startIdleAlertScheduler;
