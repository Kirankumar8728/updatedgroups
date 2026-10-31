# NexusGroups - Social Community & Group Link Hub

A modern, full-stack directory platform for discovering, verifying, sharing, and joining WhatsApp, Telegram, Discord, Facebook, Signal, and other online communities with instant QR codes, group rules acceptance flow, and social sharing.

---

## 🚀 Features

- **Multi-Platform Support**: WhatsApp, Telegram, Discord, Facebook, Signal, Snapchat, and more.
- **2-Step Verified Join Flow**:
  - `/group/rules`: Community guidelines & rules acceptance gateway.
  - `/group/join`: Instant scannable QR code, copyable official invite link, and direct platform join button.
- **Social Media Sharing**: One-click sharing for WhatsApp, X (Twitter), Telegram, Facebook, and link copying.
- **Live Metadata Scraping**: Automatic metadata extraction from public invite links.
- **Safety & Ranking**: Safety score ratings, member growth tracking, category filters, and curated tags.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** / **yarn**

### 2. Installation
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/nexus-groups.git
cd nexus-groups

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 4. Running the Development Server
```bash
npm run dev
```
The app will run locally at `http://localhost:3000`.

### 5. Production Build & Start
```bash
# Build frontend and compile backend
npm run build

# Start production server
npm start
```

---

## 📦 Deployment Options

Because this app includes an Express backend (`server.ts`) for metadata scraping and API proxying, deploy it to a platform that supports Node.js:

- **Google Cloud Run** (Built-in 1-click deploy from AI Studio)
- **Render** / **Railway** / **Fly.io**
- **Vercel** / **AWS ECS**

---

## 📄 License
MIT License.
