import { assertMockModule } from '@/native/mockModule';
import type { Scenario, ScenarioSummary, TimelinePoint } from '@/types/scenario';
import type { SimulationOptions } from '@/types/simulation';

type SimulationPayload = {
  scenario: Scenario;
  summary: ScenarioSummary;
  timeline: TimelinePoint[];
  options: SimulationOptions;
};

export async function runMockSimulation({
  scenario,
  summary,
  timeline,
  options,
}: SimulationPayload) {
  const module = assertMockModule();
  await module.startSimulation({
    timeline: timeline.map((point) => ({
      latitude: point.coordinate.latitude,
      longitude: point.coordinate.longitude,
      timestampMs: point.timestampMs,
      speedMps: point.speedMps,
    })),
    options,
  });
  console.log('[MockController] started simulation', { summary, options });
}

export async function jumpToCoordinate(options: SimulationOptions) {
  if (!options.targetCoordinate) {
    throw new Error('缺少目标坐标');
  }
  const module = assertMockModule();
  await module.startSimulation({
    timeline: [],
    options,
  });
  console.log('[MockController] jumpToCoordinate', options.targetCoordinate);
}

export async function stopMockSimulation() {
  const module = assertMockModule();
  await module.stopSimulation();
  console.log('[MockController] stopSimulation');
}
