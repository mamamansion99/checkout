import React, { useRef } from 'react';
import { AreaStatus, FileUpload } from '../types';
import { CheckCircle, AlertCircle, X, Image as ImageIcon, Trash2 } from 'lucide-react';

interface AreaCardProps {
  id: string;
  label: string;
  status: AreaStatus;
  note: string;
  files: FileUpload[];
  onStatusChange: (status: AreaStatus) => void;
  onNoteChange: (note: string) => void;
  onFileAdd: (file: File) => void;
  onFileRemove: (fileName: string) => void;
}

const AreaCard: React.FC<AreaCardProps> = ({
  id,
  label,
  status,
  note,
  files,
  onStatusChange,
  onNoteChange,
  onFileAdd,
  onFileRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileAdd(e.target.files[0]);
      e.target.value = '';
    }
  };

  const isProblem = status === 'problem';
  const isPending = status === 'pending';

  return (
    <div 
      className={`bg-white rounded-3xl p-5 shadow-soft mb-6 transition-all duration-300 border border-white/50 relative overflow-hidden ${
        isProblem ? 'ring-2 ring-danger/20 shadow-lg' : isPending ? 'hover:shadow-md' : 'hover:shadow-float border-primary/20'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <span className={`w-1.5 h-6 rounded-full block transition-colors duration-300 ${
            isProblem ? 'bg-danger' : isPending ? 'bg-gray-200' : 'bg-success'
          }`}></span>
          {label}
        </h3>
        {/* Visual checkmark when completed */}
        {!isPending && (
          <div className={`rounded-full p-1 ${isProblem ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'}`}>
             {isProblem ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          </div>
        )}
      </div>

      {/* Segmented Control */}
      <div className="bg-slate-100 p-1 rounded-xl flex relative overflow-hidden">
        <button
          onClick={() => onStatusChange('ok')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-300 relative z-10 ${
            status === 'ok'
              ? 'bg-white text-success shadow-sm ring-1 ring-black/5 scale-100'
              : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 scale-95'
          }`}
        >
          <CheckCircle size={18} className={status === 'ok' ? 'fill-current text-white bg-success rounded-full' : ''} />
          ปกติ
        </button>
        <button
          onClick={() => onStatusChange('problem')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-300 relative z-10 ${
            status === 'problem'
              ? 'bg-white text-danger shadow-sm ring-1 ring-black/5 scale-100'
              : 'text-gray-400 hover:text-gray-600 hover:bg-white/50 scale-95'
          }`}
        >
          <AlertCircle size={18} className={status === 'problem' ? 'fill-current text-white bg-danger rounded-full' : ''} />
          มีปัญหา
        </button>
      </div>

      {/* Expandable Section with Bounce Animation */}
      <div 
        className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform origin-top ${
          isProblem 
            ? 'max-h-[800px] opacity-100 translate-y-0 mt-4' 
            : 'max-h-0 opacity-0 -translate-y-4 mt-0 pointer-events-none'
        }`}
      >
        <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 space-y-4">
          
          <div className="flex items-start gap-2 text-danger text-xs font-medium px-1">
             <AlertCircle size={14} /> 
             <span>โปรดระบุปัญหาและถ่ายภาพประกอบ</span>
          </div>

          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="ระบุปัญหาที่พบ เช่น เป็นรอย, ใช้งานไม่ได้..."
            className="w-full p-3 rounded-xl bg-white border border-red-100 focus:ring-2 focus:ring-danger/20 focus:border-danger/30 transition-all text-sm min-h-[80px] resize-y placeholder:text-gray-400"
          />

          {/* File List */}
          {files.length > 0 && (
            <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar px-1">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="relative flex-shrink-0 w-20 h-20 group animate-in zoom-in duration-300">
                  <img
                    src={file.preview}
                    alt="preview"
                    className="w-full h-full object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                  <button
                    onClick={() => onFileRemove(file.name)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 border border-red-100 p-1 rounded-full shadow-md transition-transform hover:scale-110"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all px-4 py-2 rounded-xl shadow-sm active:scale-95"
            >
              <ImageIcon size={18} />
              {files.length > 0 ? 'เพิ่มรูปภาพอีก' : 'แนบรูปภาพหลักฐาน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaCard;