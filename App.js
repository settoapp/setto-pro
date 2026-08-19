import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './supabase';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CoachHomeScreen from './screens/CoachHomeScreen';
import CoachProfileSetupScreen from './screens/CoachProfileSetupScreen';
import CoachAvailabilityScreen from './screens/CoachAvailabilityScreen';
import CoachBookingsScreen from './screens/CoachBookingsScreen';
import CoachCalendarScreen from './screens/CoachCalendarScreen';
import ClientProfileScreen from './screens/ClientProfileScreen';
import { colors } from './theme';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['https://pro.setto.ro', 'https://setto-pro.vercel.app', 'http://localhost:8081'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      CoachHome: 'acasa',
      CoachProfileSetup: 'profil',
      CoachAvailability: 'disponibilitate',
      CoachBookings: 'rezervari',
      CoachCalendar: 'calendar',
      ClientProfile: 'client/:clientId',
    },
  },
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.role === 'coach') {
          setInitialRoute('CoachHome');
        } else {
          await supabase.auth.signOut();
          setInitialRoute('Login');
        }
      } else {
        setInitialRoute('Login');
      }
      setLoading(false);
    }
    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="CoachHome" component={CoachHomeScreen} />
        <Stack.Screen name="CoachProfileSetup" component={CoachProfileSetupScreen} />
        <Stack.Screen name="CoachAvailability" component={CoachAvailabilityScreen} />
        <Stack.Screen name="CoachBookings" component={CoachBookingsScreen} />
        <Stack.Screen name="CoachCalendar" component={CoachCalendarScreen} />
        <Stack.Screen name="ClientProfile" component={ClientProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}