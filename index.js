import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Salveaza hash-ul inainte ca React Navigation sa il proceseze
if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
  sessionStorage.setItem('supabase_hash', window.location.hash);
}