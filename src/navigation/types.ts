export type RootTabParamList = {
  Designer: undefined;
  Scenarios: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  MapFullScreen: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
