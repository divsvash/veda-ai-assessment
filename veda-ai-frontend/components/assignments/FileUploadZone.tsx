'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssignmentStore } from '@/store/assignmentStore';

export default function FileUploadZone() {
  const { form, updateForm } = useAssignmentStore();
  const { file } = form;

  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) updateForm({ file: accepted[0] }); },
    [updateForm]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3.5 border border-dashed border-gray-300 rounded-xl bg-gray-50">
        {/* File icon */}
        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
            <path d="M2 0C1.175 0 0.5 0.675 0.5 1.5V14.5C0.5 15.325 1.175 16 2 16H12C12.825 16 13.5 15.325 13.5 14.5V4.5L9.5 0H2Z" fill="#E5E7EB"/>
            <path d="M9.5 0V4.5H13.5L9.5 0Z" fill="#9CA3AF"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-gray-800 truncate">{file.name}</p>
          <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => updateForm({ file: null })}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-7 border-2 border-dashed rounded-xl cursor-pointer transition-colors select-none',
        isDragActive ? 'border-orange-400 bg-orange-50/60' : 'border-gray-200 hover:border-gray-300 bg-white'
      )}
    >
      <input {...getInputProps()} />

      {/* Upload icon — matches Figma exactly */}
      <div className="flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="18" fill="#F3F4F6"/>
          <path d="M18 11V25M11 18H25" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 14L18 10L22 14" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="26" cy="12" r="6" fill="#F9FAFB" stroke="#E5E7EB"/>
          <path d="M26 9.5V14.5M23.5 12H28.5" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="text-center">
        <p className="text-[13px] text-gray-600 font-medium leading-snug">
          {isDragActive ? 'Drop it here!' : 'Choose a file or drag & drop it here'}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">JPEG, PNG, upto 10MB</p>
      </div>

      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="text-[12px] text-gray-600 border border-gray-300 rounded-lg px-5 py-1.5 hover:bg-gray-50 transition-colors bg-white shadow-sm"
      >
        Browse Files
      </button>
    </div>
  );
}
