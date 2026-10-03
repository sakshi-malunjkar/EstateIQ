// ============================================================
// VAPI AI VOICE AGENT INTEGRATION PLACEHOLDER FOR CLAUDE CODE
// ============================================================
// This file is prepared for Claude Code to complete Vapi SDK integration.
//
// STEPS FOR CLAUDE CODE:
// 1. Install Vapi Web SDK inside website/:
//    npm install @vapi-ai/web
//
// 2. Set environment variables in website/.env:
//    VITE_VAPI_PUBLIC_KEY=your_vapi_public_key_here
//    VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id_here
//
// 3. Uncomment and activate the Vapi SDK wrapper below:

export const VAPI_CONFIG = {
  publicKey: import.meta.env.VITE_VAPI_PUBLIC_KEY || "YOUR_VAPI_PUBLIC_KEY",
  assistantId: import.meta.env.VITE_VAPI_ASSISTANT_ID || "YOUR_VAPI_ASSISTANT_ID",
};

/**
 * Interface definition for Vapi Call States
 */
export const VAPI_CALL_STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  ENDED: 'ended',
  ERROR: 'error',
};

/* 
// UNCOMMENT AFTER INSTALLING @vapi-ai/web
import Vapi from '@vapi-ai/web';

export const vapiInstance = new Vapi(VAPI_CONFIG.publicKey);

export const startVoiceConversation = async (onStatusChange) => {
  try {
    if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.CONNECTING);

    vapiInstance.on('call-start', () => {
      if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.CONNECTED);
    });

    vapiInstance.on('speech-start', () => {
      if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.SPEAKING);
    });

    vapiInstance.on('speech-end', () => {
      if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.LISTENING);
    });

    vapiInstance.on('call-end', () => {
      if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.ENDED);
    });

    vapiInstance.on('error', (err) => {
      console.error('Vapi Error:', err);
      if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.ERROR);
    });

    await vapiInstance.start(VAPI_CONFIG.assistantId);
  } catch (error) {
    console.error('Failed to start Vapi voice agent:', error);
    if (onStatusChange) onStatusChange(VAPI_CALL_STATUS.ERROR);
  }
};

export const endVoiceConversation = () => {
  if (vapiInstance) {
    vapiInstance.stop();
  }
};
*/
