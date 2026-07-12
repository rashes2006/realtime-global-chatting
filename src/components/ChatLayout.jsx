import React, { useState, useEffect } from 'react';
import { upsertUser, setupPresence, logout } from '../firebase';
import { LogOut, Hash, MessageSquare } from 'lucide-react';
import ConversationList from './ConversationList';
import UserList from './UserList';
import ChatRoom from './ChatRoom';

/**
 * ChatLayout — main layout after login.
 * Left panel: sidebar (nav rail) + conversation list.
 * Right panel: active chat (global or DM).
 *
 * Props:
 *   user — current Firebase auth user
 */
function ChatLayout({ user }) {
  const [activeChat, setActiveChat] = useState({ type: 'global' });
  const [showUserList, setShowUserList] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Track screen size for responsive behavior
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mount: upsert user profile and setup presence
  useEffect(() => {
    upsertUser(user).catch((err) => {
      console.warn("Failed to upsert user profile (check Firestore rules):", err);
    });
    const unsubPresence = setupPresence(user.uid);
    return () => {
      if (typeof unsubPresence === 'function') unsubPresence();
    };
  }, [user]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    if (isMobile) {
      setShowConversations(false);
    }
  };

  const handleBack = () => {
    setShowConversations(true);
  };

  const handleNewChat = () => {
    setShowUserList(true);
  };

  const handleStartChat = (chat) => {
    handleSelectChat(chat);
    setShowUserList(false);
  };

  return (
    <>
      {/* Sidebar nav rail */}
      <div className="sidebar">
        <img
          src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
          alt="Avatar"
          className="user-avatar"
        />
        <div
          className={`sidebar-item ${activeChat.type === 'global' ? 'active' : ''}`}
          title="Global Chat"
          onClick={() => handleSelectChat({ type: 'global' })}
        >
          <Hash size={24} />
        </div>
        <div
          className="sidebar-item"
          title="New Chat"
          onClick={handleNewChat}
        >
          <MessageSquare size={24} />
        </div>
        <div className="sidebar-item logout" onClick={logout} title="Sign Out">
          <LogOut size={24} />
        </div>
      </div>

      {/* Conversation list panel */}
      <div className={`conversation-panel ${showConversations ? 'visible' : 'hidden'}`}>
        <ConversationList
          user={user}
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Chat area */}
      <div className={`chat-panel ${!showConversations ? 'visible' : ''}`}>
        <ChatRoom
          user={user}
          chatMode={activeChat.type}
          conversationId={activeChat.conversationId}
          otherUser={activeChat.otherUser}
          onBack={isMobile ? handleBack : null}
        />
      </div>

      {/* User list modal */}
      {showUserList && (
        <UserList
          user={user}
          onClose={() => setShowUserList(false)}
          onStartChat={handleStartChat}
        />
      )}
    </>
  );
}

export default ChatLayout;
