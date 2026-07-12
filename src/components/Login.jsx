import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { signInWithGoogle } from '../firebase';

function Login() {
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Please check your Firebase configuration in src/firebase.js. Ensure Authentication is enabled.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">NovaChat</h1>
        <p className="login-subtitle">Connect in real-time. Seamlessly.</p>
        
        <button onClick={handleLogin} className="btn-primary" style={{ margin: '0 auto' }}>
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            style={{ width: '24px', height: '24px', backgroundColor: '#fff', borderRadius: '50%', padding: '2px' }} 
          />
          Sign in with Google
        </button>

        {error && (
          <div style={{ marginTop: '1.5rem', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', maxWidth: '300px', textAlign: 'left', lineHeight: '1.4' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
