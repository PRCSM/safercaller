import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClassifiedsFeedScreen from '../screens/classifieds/ClassifiedsFeedScreen';
import ListingDetailScreen from '../screens/classifieds/ListingDetailScreen';
import { slideFromRight } from './transitions';

const Stack = createNativeStackNavigator();

export default function ClassifiedsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, ...slideFromRight }}>
      <Stack.Screen name="ClassifiedsFeed" component={ClassifiedsFeedScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </Stack.Navigator>
  );
}
