import React, { useState, useEffect } from 'react';
import { db, subscribeToUserStatus } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { MessageSquare, Hash } from 'lucide-react';

/**
 * ConversationList — shows Global Chat + DM threads.
 *
 * Props:
 *   user        — current Firebase auth user
 *   activeChat  — { type: 'global' } | { type: 'dm', conversationId, otherUser }
 *   onSelectChat — callback to switch active chat
 *   onNewChat    — callback to open UserList modal
 */
function ConversationList({ user, activeChat, onSelectChat, onNewChat }) {
  const [conversations, setConversations] = useState([]);
  const [onlineStatuses, setOnlineStatuses] = useState({});

  // Listen for DM conversations the current user is part of
  useEffect(() => {
    let unsubscribe;

    const setupQuery = (useOrderBy = true) => {
      let q;
      if (useOrderBy) {
        q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid),
          orderBy('lastMessageAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid)
        );
      }

      unsubscribe = onSnapshot(q, (snapshot) => {
        const convs = [];
        snapshot.forEach((docSnap) => {
          convs.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (!useOrderBy) {
          // Client-side sort fallback if composite index doesn't exist yet
          convs.sort((a, b) => {
            const timeA = a.lastMessageAt?.seconds || 0;
            const timeB = b.lastMessageAt?.seconds || 0;
            return timeB - timeA;
          });
        }

        setConversations(convs);
      }, (error) => {
        // If order-by fails (most likely due to missing index), fallback to simple query
        if (useOrderBy && (error.code === 'failed-precondition' || error.message?.includes('index'))) {
          console.warn("Firestore composite index not created yet. Falling back to client-side sorting. Click the link in the error to create it:", error.message);
          if (unsubscribe) unsubscribe();
          setupQuery(false);
        } else {
          console.error("Error listening to conversations:", error);
        }
      });
    };

    setupQuery(true);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user.uid]);

  // Subscribe to online statuses of conversation partners
  useEffect(() => {
    const unsubscribes = [];

    conversations.forEach((conv) => {
      const otherUid = conv.participants.find((p) => p !== user.uid);
      if (otherUid) {
        const unsub = subscribeToUserStatus(otherUid, (isOnline) => {
          setOnlineStatuses((prev) => ({ ...prev, [otherUid]: isOnline }));
        });
        unsubscribes.push(unsub);
      }
    });

    return () => unsubscribes.forEach((u) => u());
  }, [conversations, user.uid]);

  const getOtherUserInfo = (conv) => {
    const otherUid = conv.participants.find((p) => p !== user.uid);
    const details = conv.participantDetails?.[otherUid] || {};
    return {
      uid: otherUid,
      displayName: details.displayName || 'Unknown',
      photoURL: details.photoURL || '',
      online: onlineStatuses[otherUid] || false,
    };
  };

  const isGlobalActive = activeChat.type === 'global';

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h2>Chats</h2>
        <button className="new-chat-btn" onClick={onNewChat} title="New conversation">
          <MessageSquare size={18} />
          <span>New</span>
        </button>
      </div>

      <div className="conversation-items">
        {/* Global Chat — always first */}
        <div
          className={`conversation-item ${isGlobalActive ? 'active' : ''}`}
          onClick={() => onSelectChat({ type: 'global' })}
        >
          <div className="conversation-avatar-wrapper">
            <div className="conversation-avatar global-avatar">
              <Hash size={20} />
            </div>
            <span className="presence-dot online"></span>
          </div>
          <div className="conversation-info">
            <span className="conversation-name">Global Chat</span>
            <span className="conversation-preview">Chat with everyone</span>
          </div>
        </div>

        {/* DM Conversations */}
        {conversations.map((conv) => {
          const other = getOtherUserInfo(conv);
          const isActive =
            activeChat.type === 'dm' && activeChat.conversationId === conv.id;

          return (
            <div
              key={conv.id}
              className={`conversation-item ${isActive ? 'active' : ''}`}
              onClick={() =>
                onSelectChat({
                  type: 'dm',
                  conversationId: conv.id,
                  otherUser: other,
                })
              }
            >
              <div className="conversation-avatar-wrapper">
                <img
                  src={other.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                  alt={other.displayName}
                  className="conversation-avatar"
                />
                <span className={`presence-dot ${other.online ? 'online' : 'offline'}`}></span>
              </div>
              <div className="conversation-info">
                <span className="conversation-name">{other.displayName}</span>
                <span className="conversation-preview">
                  {conv.lastMessage || 'No messages yet'}
                </span>
              </div>
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="no-conversations">
            <p>No personal chats yet</p>
            <p className="hint">Tap "New" to start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationList;
