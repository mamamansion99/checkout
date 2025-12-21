import { SessionData, SubmitPayload, SubmitResponse } from '../types';
import { InboxFlow, FlowDetail } from '../types';

// 1. Keep GAS for getting Room Info (It's fast and good for database lookups)
const GAS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLfksDjH_cNPhvO6gcDw8lWNRRtalwPXROnRgM1Hwexs02Zruh10XAZFq798KyiIn-rw/exec'; 

// 2. Use n8n for Submission (Dedicated checkout webhook)
const N8N_CHECKOUT_WEBHOOK = 'https://n8n.srv1112305.hstgr.cloud/webhook-test/form-receiver';

export const IS_MOCK = false; // Set to false to use real APIs

/**
 * Helper: Compress Image before converting to Base64
 * This solves the "Image not stored" / Payload too large issue
 */
const compressImage = async (file: File, maxWidth = 1024, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        ctx?.canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
          },
          'image/jpeg', // Force JPEG for better compression
          quality
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getFlowIdFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('flowId');
};

/**
 * 1. GET Room Info -> Calls Google Apps Script
 */
export const getSessionInfo = async (flowId: string): Promise<SessionData> => {
  try {
    // We send flowId as a query param
    const response = await fetch(`${GAS_SCRIPT_URL}?flowId=${flowId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch session:', error);
    throw error;
  }
};

/**
 * 2. POST Submission -> Calls n8n Webhook
 */
export const submitCheckoutInspection = async (payload: SubmitPayload): Promise<SubmitResponse> => {
  try {
    // Send directly to n8n
    const response = await fetch(N8N_CHECKOUT_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to submit to n8n:', error);
    throw error;
  }
};

/**
 * Updated fileToBase64 to include compression
 */
export const fileToBase64 = async (file: File): Promise<string> => {
  // 1. Compress first
  const compressedBlob = await compressImage(file);
  
  // 2. Convert to Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(compressedBlob);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/... prefix
      const base64Clean = result.split(',')[1];
      resolve(base64Clean);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * New endpoints for inbox + flow detail
 */
export const getTasksInbox = async (): Promise<{ ok: boolean; flows: InboxFlow[] }> => {
  const response = await fetch(`${GAS_SCRIPT_URL}?action=tasksInbox`);
  return response.json();
};

export const getFlowDetail = async (flowId: string): Promise<{ ok: boolean; flow?: FlowDetail['flow']; tasks?: FlowDetail['tasks']; error?: string }> => {
  const response = await fetch(`${GAS_SCRIPT_URL}?action=flowDetail&flowId=${flowId}`);
  return response.json();
};
