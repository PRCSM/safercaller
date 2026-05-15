import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScamHomeScreen from '../screens/scam/ScamHomeScreen';
import ScamSearchScreen from '../screens/scam/ScamSearchScreen';
import ScamDetailScreen from '../screens/scam/ScamDetailScreen';
import { slideFromRight } from './transitions';

const Stack = createNativeStackNavigator();

export default function ScamStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...slideFromRight }}>
      <Stack.Screen name="ScamHome" component={ScamHomeScreen} />
      <Stack.Screen name="ScamSearch" component={ScamSearchScreen} />
      <Stack.Screen name="ScamDetail" component={ScamDetailScreen} />
    </Stack.Navigator>
  );
}
