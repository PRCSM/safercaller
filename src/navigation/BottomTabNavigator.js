import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DialerScreen from '../screens/dialer/DialerScreen';
import CallLogsScreen from '../screens/dialer/CallLogsScreen';
import ScamStack from './ScamStack';
import ClassifiedsStack from './ClassifiedsStack';
import ProfileStack from './ProfileStack';
import AnimatedTabBar from './AnimatedTabBar';
import { STRINGS } from '../constants/strings';

const Tab = createBottomTabNavigator();

/**
 * Bottom tabs. Visual + animation work lives in AnimatedTabBar; this file
 * just declares the routes and the labels (read via `options.title`).
 *
 * Set `tabBarBadge` per screen if you want the unread badge to appear —
 * e.g. compute from the chat store on the Recents tab.
 */
export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen
        name="DialerTab"
        component={DialerScreen}
        options={{ title: STRINGS.tabs.dialer }}
      />
      <Tab.Screen
        name="RecentsTab"
        component={CallLogsScreen}
        options={{ title: STRINGS.tabs.recents }}
      />
      <Tab.Screen
        name="ScamTab"
        component={ScamStack}
        options={{ title: STRINGS.tabs.scam }}
      />
      <Tab.Screen
        name="ListingsTab"
        component={ClassifiedsStack}
        options={{ title: STRINGS.tabs.listings }}
      />
      <Tab.Screen
        name="MoreTab"
        component={ProfileStack}
        options={{ title: STRINGS.tabs.more }}
      />
    </Tab.Navigator>
  );
}
