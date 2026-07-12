import React, { useState } from 'react';
import { format } from 'date-fns';
import { Play, X } from 'lucide-react';

function Message({ message, isOwn }) {
  const { text, displayName, photoURL, mediaUrl, mediaData, mediaType, videoDuration, createdAt } = message;
  const [showFullImage, setShowFullImage] = useState(false);
  
  let timeStr = '';
  if (createdAt?.toDate) {
    timeStr = format(createdAt.toDate(), 'h:mm a');
  }

  // Determine image source — supports both old Storage URLs and new base64
  const imageSrc = mediaData || mediaUrl;
  const isImage = mediaType === 'image';
  const isVideo = mediaType === 'video';
  const isVideoThumb = mediaType === 'video-thumbnail';

  return (
    <div className={`message-wrapper ${isOwn ? 'sent' : 'received'} message-animate-in`}>
      {!isOwn && (
        <img 
          src={photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} 
          alt="Avatar" 
          className="message-avatar" 
        />
      )}
      <div className="message-content">
        {!isOwn && <span className="message-sender-name">{displayName}</span>}
        
        <div className="message-bubble">
          {/* Text content */}
          {text && !isVideoThumb && <p>{text}</p>}
          
          {/* Image — clickable to view full size */}
          {isImage && imageSrc && (
            <>
              <img 
                src={imageSrc} 
                alt="shared photo" 
                className="message-media" 
                onClick={() => setShowFullImage(true)}
                style={{ cursor: 'pointer' }}
              />
              {showFullImage && (
                <div className="image-lightbox" onClick={() => setShowFullImage(false)}>
                  <button className="lightbox-close" onClick={() => setShowFullImage(false)}>
                    <X size={24} />
                  </button>
                  <img src={imageSrc} alt="Full size" className="lightbox-image" />
                </div>
              )}
            </>
          )}
          
          {/* Video from Firebase Storage (old method, if Blaze plan) */}
          {isVideo && mediaUrl && (
            <video src={mediaUrl} controls className="message-media" style={{ maxHeight: '200px' }} />
          )}
          
          {/* Video thumbnail (free plan — shows preview frame) */}
          {isVideoThumb && imageSrc && (
            <div className="video-thumbnail-wrapper">
              <img src={imageSrc} alt="Video preview" className="message-media" />
              <div className="video-thumbnail-overlay">
                <Play size={32} fill="white" />
                {videoDuration && <span className="video-duration">{videoDuration}s</span>}
              </div>
              {text && <p className="video-caption">{text}</p>}
            </div>
          )}
        </div>
        
        {timeStr && <span className="message-timestamp">{timeStr}</span>}
      </div>
    </div>
  );
}

export default Message;
