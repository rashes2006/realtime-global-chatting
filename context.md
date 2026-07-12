# Project Context: NovaChat

NovaChat is a modern, real-time global chat application featuring a sleek slate/blue dark theme, Google Authentication, and media upload capabilities (images and videos).

---

## 🚀 Tech Stack & Libraries

- **Frontend Core**: [React (v19)](https://react.dev) initialized with [Vite (v8)](https://vite.dev).
- **Styling**: Modern Vanilla CSS with variables and animations defined in [src/index.css](file:///Users/rashestripathy/Documents/chatting%20App/src/index.css).
- **Icons**: [Lucide React](https://lucide.dev) (`lucide-react`) for UI icons.
- **Date Handling**: [date-fns](https://date-fns.org) for formatting message timestamps.
- **State & Hooks**: React hooks (`useState`, `useEffect`, `useRef`) paired with `react-firebase-hooks` for streamlined Firebase authentication state handling.

---

## 🔥 Backend & Database (Firebase)

The application integrates with Firebase to support real-time interactions, authentication, and file sharing. See configuration in [src/firebase.js](file:///Users/rashestripathy/Documents/chatting%20App/src/firebase.js).

### 🔑 Authentication
- **Provider**: Google Sign-In via `signInWithPopup`.
- **Session Management**: Tracked using `useAuthState(auth)`.

### 🗄️ Cloud Firestore
- **Collection**: `messages`
- **Query Strategy**: Ordered by `createdAt` in descending order, limited to the 50 most recent messages, and listened to in real-time via `onSnapshot`.
- **Document Schema**:
  ```typescript
  interface Message {
    id: string;             // Firestore document ID
    text: string;           // Text message content (optional if mediaUrl is present)
    uid: string;            // Sender's Firebase Auth User ID
    displayName: string;    // Sender's display name
    photoURL: string;       // Sender's avatar image URL
    createdAt: Timestamp;   // Firebase server timestamp
    mediaUrl?: string;      // URL of uploaded media in Firebase Storage (optional)
    mediaType?: 'image' | 'video'; // Type of media attached (optional)
  }
  ```

### 📁 Firebase Storage
- **Path**: `/uploads/{timestamp}_{fileName}`
- **Functionality**: Handles resumable file uploads (`uploadBytesResumable`) with progress updates, supporting both images and videos.

---

## 🎨 UI & Layout Design System

- **Color Theme**: Curated dark slate/blue palette:
  - Backgrounds: Dark slate (`#0F172A`), card/secondary backgrounds (`#1E293B`).
  - Accent Color: Soft blue (`#3B82F6`) changing to a deeper blue (`#2563EB`) on hover.
  - Text: High contrast slate-white (`#F8FAFC`) and muted slate-gray (`#94A3B8`) for secondary text.
- **Transitions & Animations**: Micro-animations for page fade-in and smooth sliding transitions for incoming chat bubbles.
- **Responsive Layout**:
  - **Desktop**: Split screen with a narrow left navigation/status bar (80px width) and a wide conversation area.
  - **Mobile (≤768px width)**: Layout flips. The sidebar becomes a bottom navigation bar, margins/paddings compress, and hardware-accelerated slide-in animations are active for optimal mobile rendering.

---

## 🛠️ Scripts & Local Development

Run the following commands in the project root:

| Command | Action |
|---|---|
| `npm run dev` | Runs the Vite local development server. |
| `npm run build` | Builds the production bundle of the client app. |
| `npm run preview` | Previews the locally built production bundle. |
| `npm run lint` | Lints code using ESLint configurations. |
