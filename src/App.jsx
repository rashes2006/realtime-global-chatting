import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, signInWithGoogle, logout } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { LogOut, Image as ImageIcon, Send, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="status-dot" style={{ width: '20px', height: '20px', animation: 'fadeIn 1s infinite alternate' }}></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {user ? <ChatRoom user={user} /> : <Login />}
    </div>
  );
}

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

function ChatRoom({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const scrollRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    // Listen for realtime messages
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ ...doc.data(), id: doc.id });
      });
      setMessages(msgs.reverse());
      
      setTimeout(() => {
        if(scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      // Create preview
      const previewUrl = URL.createObjectURL(selected);
      setFilePreview({
        url: previewUrl,
        type: selected.type.startsWith('video/') ? 'video' : 'image'
      });
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    const messageData = {
      text: newMessage,
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    };

    setNewMessage('');

    if (file) {
      // Upload file to storage first
      const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload Error:", error);
          cancelUpload();
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          messageData.mediaUrl = downloadURL;
          messageData.mediaType = file.type.startsWith('video/') ? 'video' : 'image';
          
          await addDoc(collection(db, 'messages'), messageData);
          cancelUpload();
        }
      );
    } else {
      await addDoc(collection(db, 'messages'), messageData);
    }
  };

  return (
    <>
      <div className="sidebar">
        <img src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="Avatar" className="user-avatar" />
        <div className="sidebar-item active" title="Chat">
          <ImageIcon size={24} />
        </div>
        <div className="sidebar-item logout" onClick={logout} title="Sign Out">
          <LogOut size={24} />
        </div>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <div className="chat-header-title">
            <span className="status-dot"></span>
            Global Chat
          </div>
        </div>

        <div className="messages-container">
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} isOwn={msg.uid === user.uid} />
          ))}
          <div ref={scrollRef}></div>
        </div>

        <div className="input-area">
          {filePreview && (
            <div className="upload-preview-container">
              {filePreview.type === 'video' ? (
                <video src={filePreview.url} className="upload-preview" />
              ) : (
                <img src={filePreview.url} className="upload-preview" alt="Preview" />
              )}
              {uploadProgress > 0 && <span style={{fontSize: '0.8rem'}}>{Math.round(uploadProgress)}%</span>}
              <button className="cancel-upload" onClick={cancelUpload}>
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="input-container">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
            />
            
            <input 
              type="file" 
              accept="image/*,video/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            <button 
              type="button" 
              className="action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={20} />
            </button>

            <button 
              type="submit" 
              className="send-btn"
              disabled={(!newMessage.trim() && !file) || uploadProgress > 0}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function Message({ message, isOwn }) {
  const { text, displayName, photoURL, mediaUrl, mediaType, createdAt } = message;
  
  let timeStr = '';
  if (createdAt?.toDate) {
    timeStr = format(createdAt.toDate(), 'h:mm a');
  }

  return (
    <div className={`message-wrapper ${isOwn ? 'sent' : 'received'} message-animate-in`}>
      {!isOwn && (
        <img src={photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="Avatar" className="message-avatar" />
      )}
      <div className="message-content">
        {!isOwn && <span className="message-sender-name">{displayName}</span>}
        
        <div className="message-bubble">
          {text && <p>{text}</p>}
          
          {mediaUrl && mediaType === 'image' && (
            <img src={mediaUrl} alt="uploaded content" className="message-media" />
          )}
          
          {mediaUrl && mediaType === 'video' && (
            <video src={mediaUrl} controls className="message-media" style={{ maxHeight: '200px' }} />
          )}
        </div>
        
        {timeStr && <span className="message-timestamp">{timeStr}</span>}
      </div>
    </div>
  );
}

export default App;
