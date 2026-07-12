import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { Image as ImageIcon, Send, X, ArrowLeft, AlertCircle, Loader } from 'lucide-react';
import Message from './Message';
import { compressImage, extractVideoThumbnail } from '../utils/imageCompressor';

/**
 * ChatRoom — handles both Global Chat and DM conversations.
 * 
 * Media is compressed client-side and stored as base64 directly in Firestore
 * (no Firebase Storage needed — works on the free Spark plan).
 *
 * Props:
 *   user           — current Firebase auth user
 *   chatMode       — 'global' | 'dm'
 *   conversationId — Firestore doc ID (only used when chatMode === 'dm')
 *   otherUser      — { uid, displayName, photoURL, online } (only when chatMode === 'dm')
 *   onBack         — callback to go back to conversation list (mobile)
 */
function ChatRoom({ user, chatMode = 'global', conversationId, otherUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef();
  const fileInputRef = useRef();

  // Determine the Firestore collection path based on chat mode
  const getMessagesRef = () => {
    if (chatMode === 'dm' && conversationId) {
      return collection(db, 'conversations', conversationId, 'messages');
    }
    return collection(db, 'messages');
  };

  useEffect(() => {
    const messagesRef = getMessagesRef();
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ ...docSnap.data(), id: docSnap.id });
      });
      setMessages(msgs.reverse());

      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    return () => unsubscribe();
  }, [chatMode, conversationId]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Validate file type
    if (!selected.type.startsWith('image/') && !selected.type.startsWith('video/')) {
      setUploadError('Only images and videos are supported');
      return;
    }

    // For images: max 10MB before compression (will be compressed to ~150KB)
    if (selected.type.startsWith('image/') && selected.size > 10 * 1024 * 1024) {
      setUploadError('Image must be under 10MB');
      return;
    }

    // For videos: max 5MB (we extract a thumbnail frame only)
    if (selected.type.startsWith('video/') && selected.size > 50 * 1024 * 1024) {
      setUploadError('Video must be under 50MB');
      return;
    }

    setUploadError('');
    setFile(selected);
    const previewUrl = URL.createObjectURL(selected);
    setFilePreview({
      url: previewUrl,
      type: selected.type.startsWith('video/') ? 'video' : 'image',
    });
  };

  const cancelUpload = () => {
    if (filePreview?.url) {
      URL.revokeObjectURL(filePreview.url);
    }
    setFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || sending) return;

    setSending(true);
    const messageData = {
      text: newMessage.trim(),
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
    };

    const currentText = newMessage.trim();
    setNewMessage('');

    try {
      if (file) {
        setUploadProgress(30);

        if (file.type.startsWith('image/')) {
          // Compress image and store as base64 in Firestore
          setUploadProgress(50);
          const compressedBase64 = await compressImage(file);
          setUploadProgress(80);

          messageData.mediaData = compressedBase64;
          messageData.mediaType = 'image';
        } else if (file.type.startsWith('video/')) {
          // Extract video thumbnail (can't store full video in Firestore)
          setUploadProgress(50);
          const { thumbnail, duration } = await extractVideoThumbnail(file);
          setUploadProgress(80);

          messageData.mediaData = thumbnail;
          messageData.mediaType = 'video-thumbnail';
          messageData.videoDuration = duration;
          // Override text to include video info
          if (!messageData.text) {
            messageData.text = `🎥 Video (${duration}s)`;
          }
        }

        setUploadProgress(90);
      }

      const messagesRef = getMessagesRef();
      await addDoc(messagesRef, messageData);

      // Update conversation last message if DM
      if (chatMode === 'dm' && conversationId) {
        const lastMsg = currentText || 
          (messageData.mediaType === 'image' ? '📷 Photo' : '🎥 Video');
        await updateDoc(doc(db, 'conversations', conversationId), {
          lastMessage: lastMsg,
          lastMessageAt: serverTimestamp(),
        });
      }

      setUploadProgress(100);
      cancelUpload();
    } catch (err) {
      console.error("Error sending message:", err);
      setUploadError(`Failed to send: ${err.message}`);
      // Restore the text if send failed
      if (currentText && !newMessage) {
        setNewMessage(currentText);
      }
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const headerTitle = chatMode === 'dm' && otherUser
    ? otherUser.displayName
    : 'Global Chat';

  return (
    <div className="chat-area">
      <div className="chat-header">
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="chat-header-title">
          {chatMode === 'dm' && otherUser ? (
            <>
              <img
                src={otherUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                alt="Avatar"
                className="chat-header-avatar"
              />
              <div className="chat-header-info">
                <span>{headerTitle}</span>
                <span className={`presence-indicator ${otherUser.online ? 'online' : 'offline'}`}>
                  {otherUser.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="status-dot"></span>
              {headerTitle}
            </>
          )}
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-chat">
            <p>{chatMode === 'dm' ? `Start a conversation with ${otherUser?.displayName || 'this user'}` : 'No messages yet. Say hello! 👋'}</p>
          </div>
        )}
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} isOwn={msg.uid === user.uid} />
        ))}
        <div ref={scrollRef}></div>
      </div>

      <div className="input-area">
        {uploadError && (
          <div className="upload-error">
            <AlertCircle size={14} />
            <span>{uploadError}</span>
            <button onClick={() => setUploadError('')} className="dismiss-error">
              <X size={12} />
            </button>
          </div>
        )}

        {filePreview && (
          <div className="upload-preview-container">
            {filePreview.type === 'video' ? (
              <video src={filePreview.url} className="upload-preview" />
            ) : (
              <img src={filePreview.url} className="upload-preview" alt="Preview" />
            )}
            {uploadProgress > 0 && (
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
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
            disabled={sending}
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
            disabled={sending}
          >
            <ImageIcon size={20} />
          </button>

          <button
            type="submit"
            className="send-btn"
            disabled={(!newMessage.trim() && !file) || sending}
          >
            {sending ? <Loader size={18} className="spinner" /> : <Send size={18} style={{ marginLeft: '2px' }} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatRoom;
