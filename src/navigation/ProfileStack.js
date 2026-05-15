import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreScreen from '../screens/profile/MoreScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import { slideFromRight } from './transitions';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...slideFromRight }}>
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
