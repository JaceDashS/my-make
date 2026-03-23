import React from 'react';

import {AppNavigator} from './navigation/AppNavigator.android';
import {AppProviders} from './providers/AppProviders';

function App() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}

export default App;
