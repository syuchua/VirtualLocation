import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MapDesignerScreen } from '@/screens/MapDesignerScreen';
import { ScenarioLibraryScreen } from '@/screens/ScenarioLibraryScreen';
import { MapFullScreenScreen } from '@/screens/MapFullScreenScreen';
import { RootStackParamList, RootTabParamList } from './types';
import { darkColors, lightColors } from '@/theme/colors';
import { useColorScheme } from 'react-native';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.mutedText,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
      }}
    >
      <Tab.Screen
        name="Designer"
        component={MapDesignerScreen}
        options={{
          title: '路线设计',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>🗺️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Scenarios"
        component={ScenarioLibraryScreen}
        options={{
          title: '场景库',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>📚</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="MapFullScreen"
        component={MapFullScreenScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
