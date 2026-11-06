# Mlindos Mr Ai voice 🌍

A worldwide futuristic AI voice assistant inspired by Siri and next-generation Android assistants.

---

## 🌟 Key Features

1. **Futuristic Android Voice Interface**:
   - Dynamic central glowing AI orb that visualizes `idle`, `listening`, `thinking`, `speaking`, and `error` states.
   - Real-time live audio volume waveform responding to the user's voice intensity.
   - Flagship Android frame view on desktop or edge-to-edge native mobile view on smartphones.

2. **Microphone Speech-to-Text & Spoken Answers**:
   - Web Speech API speech recognition with native Android Chrome audio permission prompt handling.
   - Smooth text-to-speech engine with auto-speak, pause/stop/replay voice controls, and audio priming to comply with mobile autoplay policies.
   - Procedural futuristic Web Audio chimes (wake, complete, and success sounds).

3. **Multilingual Worldwide Support**:
   - Native support for English, isiZulu, isiXhosa, Kiswahili, Afrikaans, Spanish, French, Portuguese, German, Arabic, Hindi, Japanese, and Chinese.

4. **Conversation History & New Chat**:
   - Automatic local conversation history persistence across browser refreshes.
   - One-tap "+ New Chat" button in the header and conversation drawer.
   - Copy response, replay voice, and smart follow-up suggestions for every response.

5. **Security & Production-Ready Architecture**:
   - **Zero Secret Exposure**: The `GEMINI_API_KEY` is **never** bundled or exposed to the frontend/browser.
   - Handled server-side via Express (`server.ts`) for Node.js / Cloud Run and via Netlify Functions (`netlify/functions/chat.ts`) for Netlify.

---

## 🚀 How to Publish to Netlify from Your Android Phone

You can deploy and publish this assistant straight from Chrome on your Android phone in 3 simple steps:

### Step 1: Push Code to GitHub
1. On your phone or computer, ensure the codebase is pushed to your GitHub repository (e.g. `mlindos-ai-voice`).

### Step 2: Connect to Netlify
1. Open Chrome on your Android phone and navigate to [app.netlify.com](https://app.netlify.com).
2. Tap **"Add new site"** → **"Import an existing project"**.
3. Choose **GitHub** and authorize Netlify.
4. Select your `mlindos-ai-voice` repository.
5. Netlify will automatically detect `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### Step 3: Add Your Gemini API Key
1. Before clicking deploy, tap **"Site configuration"** (or in **Site settings** → **Environment variables**).
2. Tap **"Add a variable"**:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key (from Google AI Studio).
3. Tap **"Deploy site"**.
4. Within 1-2 minutes, Netlify will provide your live HTTPS URL (e.g., `https://mlindos-mr-ai-voice.netlify.app`).

### Step 4: Add to Android Home Screen (PWA experience)
1. Open your new Netlify URL in Android Chrome.
2. Tap the three dots menu (⋮) in the top-right corner of Chrome.
3. Tap **"Add to Home screen"** or **"Install app"**.
4. You now have a full-screen, native-feeling AI voice assistant app right on your Android phone!
