import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import PeopleStack from './PeopleStack';
import ChatStack from './ChatStack';
import ReportScamScreen from '../screens/scam/ReportScamScreen';
import CreateListingScreen from '../screens/classifieds/CreateListingScreen';
import IncomingCallScreen from '../screens/dialer/IncomingCallScreen';
import { slideFromRight, slideFromBottom } from './transitions';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...slideFromRight }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="PeopleStack" component={PeopleStack} />
      <Stack.Screen name="ChatStack" component={ChatStack} />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ animation: 'slide_from_bottom', animationDuration: 280 }}
      />
      <Stack.Screen name="ReportScam" component={ReportScamScreen} options={slideFromBottom} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={slideFromBottom} />
    </Stack.Navigator>
  );
}
