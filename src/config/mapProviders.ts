export const mapKeys = {
  google: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  amap: process.env.EXPO_PUBLIC_AMAP_WEB_KEY ?? '',
  baidu: process.env.EXPO_PUBLIC_BAIDU_MAP_KEY ?? '',
};

export const providerOrder = ['amap', 'baidu', 'google', 'osm', 'custom'] as const;

export type ProviderKey = keyof typeof mapKeys;

export const hasProviderKey = (provider: string) => {
  switch (provider) {
    case 'google':
      return Boolean(mapKeys.google);
    case 'amap':
      return Boolean(mapKeys.amap);
    case 'baidu':
      return Boolean(mapKeys.baidu);
    default:
      return true;
  }
};
