import React from 'react';

function App() {
  return React.createElement('div', null, 
    React.createElement('h1', null, 'Hello World - React is Working!'),
    React.createElement('p', null, 'This is a test to see if React is mounting properly.')
  );
}

export default App;