import * as metricsRepository from "./metrics.repository";

async function incrementCounter(type: string) {
  return await metricsRepository.incrementCounter(type);
}

async function getAllMetrics() {
  return await metricsRepository.getAllMetrics();
}

async function getQueueDepths() {
  return await metricsRepository.getQueueDepths();
}

async function getAllWorkersHeartbeat() {
  return await metricsRepository.getAllWorkersHeartbeat();
}

async function getMetricsSnapshot() {
  const counters = await getAllMetrics();
  const queueDepths = await getQueueDepths();
  const workers = await getAllWorkersHeartbeat();

  return { counters, queueDepths, workers };
}

export {
  incrementCounter,
  getAllMetrics,
  getQueueDepths,
  getAllWorkersHeartbeat,
  getMetricsSnapshot,
};
