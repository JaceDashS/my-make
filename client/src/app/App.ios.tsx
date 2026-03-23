import React from 'react';

import {AppNavigator} from './navigation/AppNavigator.ios';
import {AppProviders} from './providers/AppProviders';

function App() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}

export default App;
