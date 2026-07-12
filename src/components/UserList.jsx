import React, { useState, useEffect } from 'react';
import { db, subscribeToUserStatus, getOrCreateConversation } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { X, Search, MessageSquare, AlertCircle, Loader } from 'lucide-react';

/**
 * UserList — modal overlay to discover users and start DMs.
 *
 * Props:
 *   user          — current Firebase auth user
 *   onClose       — callback to close the modal
 *   onStartChat   — callback({ type: 'dm', conversationId, otherUser }) when a DM is started
 */
function UserList({ user, onClose, onStartChat }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all users
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('displayName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.uid !== user.uid) {
          allUsers.push(data);
        }
      });
      setUsers(allUsers);
    }, (err) => {
      console.error("Error fetching users:", err);
      // Fallback: try without orderBy in case index is missing
      const qFallback = query(collection(db, 'users'));
      onSnapshot(qFallback, (snapshot) => {
        const allUsers = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.uid !== user.uid) {
            allUsers.push(data);
          }
        });
        allUsers.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setUsers(allUsers);
      });
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Subscribe to online statuses
  useEffect(() => {
    const unsubscribes = users.map((u) =>
      subscribeToUserStatus(u.uid, (isOnline) => {
        setOnlineStatuses((prev) => ({ ...prev, [u.uid]: isOnline }));
      })
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [users]);

  const filteredUsers = users.filter((u) =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserClick = async (otherUser) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const conversationId = await getOrCreateConversation(user, otherUser);
      onStartChat({
        type: 'dm',
        conversationId,
        otherUser: {
          uid: otherUser.uid,
          displayName: otherUser.displayName,
          photoURL: otherUser.photoURL,
          online: onlineStatuses[otherUser.uid] || false,
        },
      });
      onClose();
    } catch (err) {
      console.error("Error starting conversation:", err);
      setError(`Failed to start chat: ${err.message || 'Check Firestore rules'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-list-overlay" onClick={onClose}>
      <div className="user-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-list-header">
          <h3>New Conversation</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="user-list-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <div className="upload-error" style={{ margin: '0.5rem 1rem' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="dismiss-error">
              <X size={12} />
            </button>
          </div>
        )}

        <div className="user-list-items">
          {loading && (
            <div className="no-users" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Loader size={16} className="spinner" />
              Starting conversation...
            </div>
          )}

          {!loading && filteredUsers.length === 0 ? (
            <div className="no-users">
              {users.length === 0
                ? 'No other users have signed in yet'
                : 'No users match your search'}
            </div>
          ) : !loading && (
            filteredUsers.map((u) => (
              <div
                key={u.uid}
                className="user-list-item"
                onClick={() => handleUserClick(u)}
              >
                <div className="conversation-avatar-wrapper">
                  <img
                    src={u.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                    alt={u.displayName}
                    className="conversation-avatar"
                  />
                  <span className={`presence-dot ${onlineStatuses[u.uid] ? 'online' : 'offline'}`}></span>
                </div>
                <div className="user-list-info">
                  <span className="user-list-name">{u.displayName}</span>
                  <span className="user-list-email">{u.email}</span>
                </div>
                <MessageSquare size={16} className="user-list-chat-icon" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default UserList;
