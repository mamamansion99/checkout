import { SessionData, SubmitPayload, SubmitResponse } from '../types';

// TODO: Replace with your actual Google Apps Script Web App URL
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbx_YOUR_SCRIPT_ID_HERE/exec';

// Export a flag to let the UI know we are using fake data
export const IS_MOCK = BACKEND_URL.includes('YOUR_SCRIPT_ID_HERE');

/**
 * Parses the flowId from the URL query parameters
 */
export const getFlowIdFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('flowId');
};

/**
 * Fetches the session data (Room info) based on flowId
 */
export const getSessionInfo = async (flowId: string): Promise<SessionData> => {
  // Mock logic for development if BACKEND_URL is not set or for testing
  if (IS_MOCK) {
     console.warn('Backend URL not configured. Returning mock data.');
     return new Promise((resolve) => {
       setTimeout(() => {
         resolve({
           ok: true,
           flowId,
           building: 'B',
           floor: '5',
           roomId: 'B503',
           status: 'waiting_form'
         });
       }, 1000);
     });
  }

  try {
    const response = await fetch(`${BACKEND_URL}?flowId=${flowId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch session:', error);
    throw error;
  }
};

/**
 * Submits the inspection data
 */
export const submitInspection = async (payload: SubmitPayload): Promise<SubmitResponse> => {
  // Mock logic
  if (IS_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          roomId: payload.fields.roomId,
          pdfUrl: 'https://example.com/fake-pdf',
          signatureUrl: 'https://example.com/fake-sig'
        });
      }, 2000);
    });
  }

  try {
    // Note: Google Apps Script Web Apps require 'text/plain' or 'application/x-www-form-urlencoded' 
    // to avoid CORS preflight issues in some browser environments, 
    // but standard fetch with 'application/json' usually works if the script handles OPTIONS or if mapped correctly.
    // For this implementation, we assume standard JSON POST.
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to submit inspection:', error);
    throw error;
  }
};

/**
 * Helper to convert File to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/xyz;base64, prefix for the raw base64 string
      const base64Clean = result.split(',')[1];
      resolve(base64Clean);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Helper to get DataURL for preview (includes mime type prefix)
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };