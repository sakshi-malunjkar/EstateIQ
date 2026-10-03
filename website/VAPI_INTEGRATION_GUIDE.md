# 🤖 Vapi AI Voice Agent Integration Guide for Claude Code

This guide provides exact file paths, code structures, and instructions for **Claude Code** to seamlessly integrate the **Vapi AI Voice Agent** into this EstateIQ project.

---

## 📂 Relevant File Locations

All AI Agent code is strictly contained inside the `website/` folder:

1. **Vapi Service File**:
   - [`website/src/services/vapi.js`](file:///c:/Users/NITRO/Projects/EstateIQ/website/src/services/vapi.js)
   - *Contains configuration placeholders, status enums, and SDK event handlers.*

2. **AI Agent Contact Card**:
   - [`website/src/components/AiAgentCard.jsx`](file:///c:/Users/NITRO/Projects/EstateIQ/website/src/components/AiAgentCard.jsx)
   - *Renders the gradient blue card with the microphone icon and checkmarks list on `/contact`.*

3. **AI Agent Voice Modal**:
   - [`website/src/components/AiAgentModal.jsx`](file:///c:/Users/NITRO/Projects/EstateIQ/website/src/components/AiAgentModal.jsx)
   - *Renders the pulsing mic modal and status text when user clicks "Start Voice Conversation".*

---

## ⚙️ Steps for Claude Code

### Step 1: Install Vapi Web SDK
Run inside the `website/` folder:
```bash
cd website
npm install @vapi-ai/web
```

### Step 2: Configure Environment Variables
Create or update `website/.env`:
```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key_here
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
```

### Step 3: Activate Vapi in `website/src/services/vapi.js`
Uncomment the Vapi SDK initialization in [`website/src/services/vapi.js`](file:///c:/Users/NITRO/Projects/EstateIQ/website/src/services/vapi.js):
```javascript
import Vapi from '@vapi-ai/web';

export const vapiInstance = new Vapi(VAPI_CONFIG.publicKey);

export const startVoiceConversation = async (onStatusChange) => {
  vapiInstance.on('call-start', () => onStatusChange(VAPI_CALL_STATUS.CONNECTED));
  vapiInstance.on('speech-start', () => onStatusChange(VAPI_CALL_STATUS.SPEAKING));
  vapiInstance.on('speech-end', () => onStatusChange(VAPI_CALL_STATUS.LISTENING));
  vapiInstance.on('call-end', () => onStatusChange(VAPI_CALL_STATUS.ENDED));

  await vapiInstance.start(VAPI_CONFIG.assistantId);
};

export const endVoiceConversation = () => {
  if (vapiInstance) vapiInstance.stop();
};
```

### Step 4: Connect Trigger in `website/src/components/AiAgentModal.jsx`
Import `startVoiceConversation` and `endVoiceConversation` into `AiAgentModal.jsx` to control real-time mic streaming when the modal opens and closes.
