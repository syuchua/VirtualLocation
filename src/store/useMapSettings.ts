import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { hasProviderKey, providerOrder } from '@/config/mapProviders';

export type MapProvider = 'amap' | 'osm' | 'google' | 'baidu' | 'custom';

type MapSettingsState = {
  provider: MapProvider;
  customTemplate: string;
  actions: {
    setProvider: (provider: MapProvider) => void;
    setCustomTemplate: (template: string) => void;
  };
};

const DEFAULT_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const getInitialProvider = (): MapProvider => {
  return 'amap';
};

export const useMapSettings = create<MapSettingsState>()(
  immer((set) => ({
    provider: getInitialProvider(),
    customTemplate: DEFAULT_TEMPLATE,
    actions: {
      setProvider: (provider) => {
        set((state) => {
          state.provider = provider;
        });
      },
      setCustomTemplate: (template) => {
        set((state) => {
          state.customTemplate = template || DEFAULT_TEMPLATE;
        });
      },
    },
  })),
);
