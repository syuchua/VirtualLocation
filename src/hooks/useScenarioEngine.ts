import { useMemo } from 'react';

import { useScenarioStore, selectActiveScenario } from '@/store/useScenarioStore';
import { buildTimeline } from '@/services/scenarioEngine';

export const useScenarioEngine = () => {
  const scenario = useScenarioStore(selectActiveScenario);

  return useMemo(() => buildTimeline(scenario), [scenario]);
};
