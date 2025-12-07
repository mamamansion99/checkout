
import React, { useEffect, useState, useRef } from 'react';
import { 
  SessionData, 
  AreaMeta, 
  FileUpload, 
  ROOM_AREAS, 
  SubmitPayload,
  AreaStatus
} from './types';
import AreaCard from './components/AreaCard';
import SignaturePad from './components/SignaturePad';
import LoadingScreen from './components/LoadingScreen';
import { getFlowIdFromUrl, getSessionInfo, submitInspection, fileToBase64, fileToDataUrl, IS_MOCK } from './utils/api';
import { Loader2, ArrowRight, FileText, CheckCircle2, Building2, Search, QrCode, TestTube2, BarChart3 } from 'lucide-react';

// --- Types for State ---
type FormState = Record<string, {
  status: AreaStatus;
  note: string;
  files: FileUpload[];
}>;

const App: React.FC = () => {
  // --- Global State ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{pdfUrl: string, roomId: string} | null>(null);
  
  // Manual Entry State
  const [manualId, setManualId] = useState('');

  // --- Form State ---
  const [started, setStarted] = useState(false);
  const [inspectorName, setInspectorName] = useState(''); // Could default to Tenant if needed
  const [globalNote, setGlobalNote] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  
  // Initialize form state with 'pending' status to force user interaction
  const [formState, setFormState] = useState<FormState>(() => {
    const initial: FormState = {};
    ROOM_AREAS.forEach(area => {
      initial[area.id] = { status: 'pending', note: '', files: [] };
    });
    return initial;
  });

  const formRef = useRef<HTMLDivElement>(null);

  // --- Logic to Fetch Session ---
  const fetchSessionData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionInfo(id);
      if (!data.ok || data.status !== 'waiting_form') {
        setError(data.status === 'completed' 
          ? 'รายการนี้ได้ทำการตรวจรับไปเรียบร้อยแล้ว' 
          : 'ไม่พบข้อมูลการจอง หรือลิงก์หมดอายุ');
      } else {
        setSession(data);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาตรวจสอบอินเทอร์เน็ต');
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const flowId = getFlowIdFromUrl();
    if (flowId) {
      // If URL has ID, load immediately
      fetchSessionData(flowId);
    } else {
      // If no ID, stop loading and show manual entry screen
      setLoading(false);
    }
  }, []);

  // --- Progress Logic ---
  const totalItems = ROOM_AREAS.length;
  const completedItems = Object.values(formState).filter(item => item.status !== 'pending').length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  // --- Handlers ---
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    fetchSessionData(manualId.trim());
  };

  const startInspection = () => {
    setStarted(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleStatusChange = (areaId: string, status: AreaStatus) => {
    setFormState(prev => ({
      ...prev,
      [areaId]: { ...prev[areaId], status }
    }));
  };

  const handleNoteChange = (areaId: string, note: string) => {
    setFormState(prev => ({
      ...prev,
      [areaId]: { ...prev[areaId], note }
    }));
  };

  const handleFileAdd = async (areaId: string, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const preview = await fileToDataUrl(file);
      
      const newFile: FileUpload = {
        area: areaId,
        name: file.name,
        mime: file.type,
        base64,
        preview
      };

      setFormState(prev => ({
        ...prev,
        [areaId]: { 
          ...prev[areaId], 
          files: [...prev[areaId].files, newFile] 
        }
      }));
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    }
  };

  const handleFileRemove = (areaId: string, fileName: string) => {
    setFormState(prev => ({
      ...prev,
      [areaId]: {
        ...prev[areaId],
        files: prev[areaId].files.filter(f => f.name !== fileName)
      }
    }));
  };

  const handleSubmit = async () => {
    // 1. Validation: Check if all items are completed
    const pendingItems = ROOM_AREAS.filter(area => formState[area.id].status === 'pending');
    if (pendingItems.length > 0) {
      alert(`กรุณาตรวจสอบให้ครบทุกรายการ (เหลือ ${pendingItems.length} จุด)\n\nจุดที่ยังไม่ได้ตรวจ:\n- ${pendingItems.map(i => i.label).join('\n- ')}`);
      return;
    }

    if (!signature) {
      alert('กรุณาลงลายเซ็นก่อนส่งผลการตรวจ');
      return;
    }
    
    if (!session) return;

    if (!confirm('ยืนยันการส่งผลตรวจ? เมื่อส่งแล้วจะไม่สามารถแก้ไขได้')) return;

    setSubmitting(true);

    try {
      // 1. Construct Payload
      const metaByArea: Record<string, AreaMeta> = {};
      const allFiles: Omit<FileUpload, 'preview'>[] = [];

      Object.entries(formState).forEach(([areaId, data]) => {
        metaByArea[areaId] = {
          status: data.status,
          note: data.note
        };
        
        data.files.forEach(f => {
          allFiles.push({
            area: f.area,
            name: f.name,
            mime: f.mime,
            base64: f.base64
          });
        });
      });

      const payload: SubmitPayload = {
        flowId: session.flowId,
        fields: {
          building: session.building,
          floor: session.floor,
          roomId: session.roomId,
          inspector: inspectorName || 'ผู้เช่า',
          globalNotes: globalNote,
          tenantSignature: signature
        },
        metaByArea,
        files: allFiles
      };

      // 2. Send API
      const res = await submitInspection(payload);
      
      if (res.ok) {
        setSuccessData({ pdfUrl: res.pdfUrl, roomId: res.roomId });
        setShowSuccess(true);
      } else {
        alert('เกิดข้อผิดพลาดจากระบบ: ' + JSON.stringify(res));
      }

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Renders ---

  // 1. Loading State (Use the new Component)
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. Error State (with Retry)
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h1>
        <p className="text-gray-600 max-w-sm mb-6">{error}</p>
        <button 
          onClick={() => { setError(null); setSession(null); }}
          className="bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  // 3. Success State
  if (showSuccess && successData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-soft animate-bounce">
          <CheckCircle2 size={48} className="text-success" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">ตรวจรับห้องพักเรียบร้อย!</h1>
        <p className="text-gray-500 mb-8">
          ข้อมูลห้อง {successData.roomId} ถูกบันทึกและส่งเข้าระบบแล้ว
        </p>
        
        <div className="space-y-4 w-full max-w-xs">
          <a 
            href={successData.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-primary text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <FileText size={20} />
            เปิดไฟล์ PDF
          </a>
          <button 
            onClick={() => window.close()}
            className="w-full bg-gray-100 text-gray-600 font-semibold py-4 rounded-2xl hover:bg-gray-200 transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // 4. Starter Screen (Manual Input) - Shown if no session loaded yet
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6 flex flex-col justify-center">
        {IS_MOCK && (
          <div className="absolute top-0 left-0 w-full bg-yellow-100 text-yellow-800 text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 z-50">
            <TestTube2 size={14} />
            DEMO MODE: ระบบจำลอง (ยังไม่ได้เชื่อมต่อ Backend)
          </div>
        )}

        <div className="max-w-md mx-auto w-full bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-float border border-white">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <QrCode size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Mama Mansion</h1>
            <p className="text-gray-500">ระบบตรวจรับห้องพักออนไลน์</p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                ระบุรหัสตรวจสอบ (Flow ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder={IS_MOCK ? "ลองพิมพ์อะไรก็ได้ เช่น TEST" : "เช่น Ue905...-B503"}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 transition-all"
                  autoFocus
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
              <p className="text-xs text-gray-400 mt-2 ml-1">
                {IS_MOCK 
                  ? "* ในโหมด Demo พิมพ์อะไรก็ได้เพื่อทดสอบระบบ"
                  : "* ปกติรหัสนี้จะมาพร้อมกับลิงก์ที่ได้รับทาง LINE หรือ Email"
                }
              </p>
            </div>
            
            <button
              type="submit"
              disabled={!manualId.trim()}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ตรวจสอบข้อมูล
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 5. Main App (Inspection Form)
  return (
    <div className="max-w-md mx-auto min-h-screen pb-32">
      {IS_MOCK && (
        <div className="fixed top-0 left-0 w-full bg-yellow-100 text-yellow-800 text-xs font-bold px-4 py-1 text-center z-[100] shadow-sm flex items-center justify-center gap-2">
           <TestTube2 size={12} /> Demo Mode: ข้อมูลจำลอง (Mock Data)
        </div>
      )}

      {/* Header / Landing */}
      <header className="px-6 pt-10 pb-6 relative overflow-hidden">
        {/* Decorative background blobs - Blue & Cyan */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2 relative z-10">
          Mama Mansion <br/> <span className="text-primary text-xl font-normal">Room Inspection</span>
        </h1>
        <p className="text-gray-500 text-sm mb-6 relative z-10">
          แบบฟอร์มตรวจรับสภาพห้องพักก่อนเข้าอยู่ เพื่อความสบายใจของทั้งสองฝ่าย
        </p>

        {/* Room Info Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-soft border border-white relative z-10">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-primary rounded-xl">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">ROOM</p>
                        <h2 className="text-2xl font-bold text-gray-800">{session?.roomId}</h2>
                    </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                    CHECK-IN
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs text-gray-400">อาคาร</p>
                <p className="font-semibold text-gray-700">{session?.building}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ชั้น</p>
                <p className="font-semibold text-gray-700">{session?.floor}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ผู้เช่า (ชื่อ)</p>
                <p className="font-semibold text-gray-700">
                  {session?.hgName || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">เบอร์ติดต่อ</p>
                <p className="font-semibold text-gray-700">
                  {session?.hgPhone || '-'}
                </p>
              </div>
            </div>
        </div>
      </header>

      {!started && (
        <div className="px-6">
            <div className="bg-white/60 rounded-3xl p-6 mb-8 text-sm text-gray-600 space-y-2 border border-white">
                <p>👋 <strong>สวัสดีค่ะ!</strong> ขั้นตอนการตรวจรับห้อง:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>เดินตรวจสอบอุปกรณ์ต่างๆ ในห้อง</li>
                    <li>หากพบจุดชำรุด ให้เลือก <strong>"มีปัญหา"</strong></li>
                    <li>ถ่ายรูปจุดที่มีปัญหาแนบมาด้วย</li>
                    <li>ลงชื่อยืนยันในส่วนท้ายสุด</li>
                </ul>
            </div>
            <button
                onClick={startInspection}
                className="w-full bg-slate-800 text-white font-semibold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
            >
                เริ่มตรวจห้องพัก <ArrowRight size={20} />
            </button>
        </div>
      )}

      {/* Main Form Section */}
      <main 
        ref={formRef} 
        className={`px-4 mt-8 transition-opacity duration-700 ${started ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}
      >
        {/* Dynamic Progress Bar */}
        <div className="mb-6 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <BarChart3 size={12} /> ความคืบหน้า
              </span>
              <span className="text-xs font-bold text-primary">
                {completedItems}/{totalItems} รายการ
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
        </div>

        {ROOM_AREAS.map((area) => (
          <AreaCard
            key={area.id}
            id={area.id}
            label={area.label}
            status={formState[area.id].status}
            note={formState[area.id].note}
            files={formState[area.id].files}
            onStatusChange={(status) => handleStatusChange(area.id, status)}
            onNoteChange={(note) => handleNoteChange(area.id, note)}
            onFileAdd={(file) => handleFileAdd(area.id, file)}
            onFileRemove={(name) => handleFileRemove(area.id, name)}
          />
        ))}

        {/* Global Notes */}
        <div className="bg-white rounded-3xl p-5 shadow-soft mb-6 border border-white/50">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">ข้อเสนอแนะเพิ่มเติม</h3>
            <textarea 
                value={globalNote}
                onChange={(e) => setGlobalNote(e.target.value)}
                placeholder="มีอะไรอยากบอกเราเพิ่มเติมไหมคะ?..."
                className="w-full p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-secondary/20 min-h-[100px]"
            />
        </div>

        {/* Signature */}
        <SignaturePad onEnd={setSignature} />

        <div className="h-20"></div> {/* Spacer for sticky button */}
      </main>

      {/* Sticky Bottom Bar */}
      {started && (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-lg border-t border-gray-100 p-4 pb-8 z-50">
            <div className="max-w-md mx-auto">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`w-full font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all ${
                        submitting 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-xl hover:scale-[1.02]'
                    }`}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="animate-spin" /> กำลังส่งข้อมูล...
                        </>
                    ) : (
                        <>
                            ส่งผลตรวจห้องพัก <CheckCircle2 />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}

      {/* Use LoadingScreen for submitting state as well with custom status */}
      {submitting && (
         <LoadingScreen status="กำลังอัปโหลดรูปภาพและสร้างไฟล์ PDF..." />
      )}
    </div>
  );
};

export default App;
