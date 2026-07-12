import React from 'react';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Login from './components/Login';
import ChatLayout from './components/ChatLayout';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {user ? <ChatLayout user={user} /> : <Login />}
    </div>
  );
}

export default App;
