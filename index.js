// Import gesture handler first
import 'react-native-gesture-handler';

// Import from expo
import { registerRootComponent } from 'expo';

// Import app
import App from './App';

// Register the app - this is the proper way with Expo
registerRootComponent(App);
