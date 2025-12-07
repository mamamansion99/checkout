import { SessionData, SubmitPayload, SubmitResponse } from '../types';

// 1. Keep GAS for getting Room Info (It's fast and good for database lookups)
const GAS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz19P9rowz8apDT7RiosyuMUL4qsiDnUGc2ypbKL_Q71XCRZFXGNgSD5l-UryIhA9f1/exec'; 

// 2. Use n8n for Submission (It handles heavy images + PDF generation better)
const N8N_WEBHOOK_URL = 'https://n8n.srv1112305.hstgr.cloud/webhook/06b0cb9e-bf7a-4498-adf0-63994c16e8e6';

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
export const submitInspection = async (payload: SubmitPayload): Promise<SubmitResponse> => {
  try {
    // Send directly to n8n
    const response = await fetch(N8N_WEBHOOK_URL, {
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