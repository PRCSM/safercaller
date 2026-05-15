import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PeopleSearchScreen from '../screens/people/PeopleSearchScreen';
import ProfileViewScreen from '../screens/people/ProfileViewScreen';
import { slideFromRight } from './transitions';

const Stack = createNativeStackNavigator();

export default function PeopleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...slideFromRight }}>
      <Stack.Screen name="PeopleSearch" component={PeopleSearchScreen} />
      <Stack.Screen name="ProfileView" component={ProfileViewScreen} />
    </Stack.Navigator>
  );
}
