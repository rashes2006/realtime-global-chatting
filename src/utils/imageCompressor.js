/**
 * Image compression utility for NovaChat.
 * Compresses images client-side using Canvas API before storing as base64 in Firestore.
 * This avoids needing Firebase Storage (Blaze plan) — everything stays on the free Spark plan.
 *
 * Firestore document limit is 1MB, so we compress images to ~150KB max.
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 0.6;
const MAX_BASE64_SIZE = 800_000; // ~800KB to stay under 1MB doc limit with other fields

/**
 * Compress an image file and return a base64 data URL.
 * @param {File} file - The image file to compress
 * @returns {Promise<string>} - base64 data URL of the compressed image
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Scale down if larger than max dimensions
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Try JPEG first (smaller), then reduce quality if still too large
          let quality = JPEG_QUALITY;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          // Progressively reduce quality if the result is too large
          while (dataUrl.length > MAX_BASE64_SIZE && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // If still too large, reduce dimensions further
          if (dataUrl.length > MAX_BASE64_SIZE) {
            const shrinkRatio = 0.5;
            canvas.width = Math.round(width * shrinkRatio);
            canvas.height = Math.round(height * shrinkRatio);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          }

          if (dataUrl.length > MAX_BASE64_SIZE) {
            reject(new Error('Image is too large even after compression. Try a smaller image.'));
            return;
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Extract a thumbnail frame from a video file and return as base64.
 * Since we can't store full videos in Firestore (too large), we extract a preview frame.
 * @param {File} file - The video file
 * @returns {Promise<{thumbnail: string, duration: number}>}
 */
export const extractVideoThumbnail = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.onloadeddata = () => {
      // Seek to 1 second or 25% of video
      video.currentTime = Math.min(1, video.duration * 0.25);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = video.videoWidth;
        let height = video.videoHeight;

        // Scale down
        if (width > 640 || height > 640) {
          const ratio = Math.min(640 / width, 640 / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);

        const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
        URL.revokeObjectURL(video.src);

        resolve({
          thumbnail,
          duration: Math.round(video.duration),
        });
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to process video'));
    };

    video.src = URL.createObjectURL(file);
  });
};
