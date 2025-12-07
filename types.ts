export interface SessionData {
  ok: boolean;
  flowId: string;
  building: string;
  floor: string;
  roomId: string;
  status: 'waiting_form' | 'completed' | 'expired';
}

export type AreaStatus = 'pending' | 'ok' | 'problem';

export interface AreaMeta {
  status: AreaStatus;
  note: string;
}

export interface FileUpload {
  area: string;
  name: string;
  mime: string;
  base64: string; // The raw base64 string without data:image/... prefix for API
  preview: string; // The full data url for display
}

export interface SubmitPayload {
  flowId: string;
  fields: {
    building: string;
    floor: string;
    roomId: string;
    inspector: string;
    globalNotes: string;
    tenantSignature: string; // base64
  };
  metaByArea: Record<string, AreaMeta>;
  files: Omit<FileUpload, 'preview'>[];
}

export interface SubmitResponse {
  ok: boolean;
  roomId: string;
  pdfUrl: string;
  signatureUrl: string;
}

export const ROOM_AREAS = [
  { id: 'DOOR', label: 'ประตู' },
  { id: 'CURTAIN', label: 'ผ้าม่าน' },
  { id: 'BED', label: 'เตียงและที่นอน' },
  { id: 'CHAIR_TABLE', label: 'โต๊ะ / เก้าอี้' },
  { id: 'WARDROBE', label: 'ตู้เสื้อผ้า' },
  { id: 'AC', label: 'แอร์' },
  { id: 'TOILET_SINK', label: 'โถสุขภัณฑ์และอ่างล้างหน้า' },
  { id: 'SHOWER_HEATER', label: 'ฝักบัวและเครื่องทำน้ำอุ่น' },
  { id: 'WALL_FLOOR_CEILING', label: 'พื้น / ผนัง / เพดาน' },
];