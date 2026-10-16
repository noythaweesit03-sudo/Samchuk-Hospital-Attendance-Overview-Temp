import React, { useState } from 'react';
import { RefreshCw, Clock, PanelLeftClose, PanelLeft, Database, Trash2 } from 'lucide-react';
import { User, Scanner } from '../types/attendance';
import { DataSourceMode, StoreState } from '../services/attendanceStore';
import { DatabaseStatusModal } from './DatabaseStatusModal';

interface HeaderProps {
  title: string;
  subtitle: string;
  currentUser: User;
  scanners: Scanner[];
  pendingCount: number;
  onSyncClick: () => void;
  isSyncing: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  state: StoreState;
  onClearToRealDb: () => void;
  onLoadDemoData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  currentUser,
  scanners,
  pendingCount,
  onSyncClick,
  isSyncing,
  isCollapsed,
  onToggleCollapse,
  state,
  onClearToRealDb,
  onLoadDemoData
}) => {
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const onlineCount = scanners.filter(s => s.status === 'ONLINE').length;
  const isAdmin = currentUser.role === 'ADMIN';
  const isRealEmpty = state.dataSourceMode === 'REAL_EMPTY';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        {/* Title & Toggle Button */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
              title={isCollapsed ? 'ขยายแถบเมนู (Expand)' : 'ย่อแถบเมนู (Collapse)'}
            >
              {isCollapsed ? <PanelLeft className="w-5 h-5 text-teal-700" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 leading-tight truncate">
              {title}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Bar */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Data Source Mode Switcher Badge (Answers user question #2 directly!) */}
          <button
            onClick={() => setIsDbModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
              isRealEmpty
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
            title="คลิกเพื่อดูสถานะฐานข้อมูล 10.2.0.201 หรือสลับระหว่างโหมดข้อมูลจริงกับโหมดตัวอย่าง"
          >
            <Database className={`w-3.5 h-3.5 ${isRealEmpty ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div className="flex items-center gap-1.5">
              <span>แหล่งข้อมูล:</span>
              <span className="font-bold underline underline-offset-2">
                {isRealEmpty ? 'ฐานข้อมูลจริง 10.2.0.201 (0 รายการ)' : 'ข้อมูลจำลอง (Demo)'}
              </span>
            </div>
          </button>

          {/* Quick Toggle Button between Empty Real and Demo */}
          {isAdmin && (
            isRealEmpty ? (
              <button
                onClick={onLoadDemoData}
                className="hidden xl:flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
                title="โหลดชุดข้อมูลตัวอย่าง 150 รายการเพื่อทดสอบระบบ"
              >
                <RefreshCw className="w-3 h-3 text-teal-600" />
                <span>โหลดข้อมูลตัวอย่าง</span>
              </button>
            ) : (
              <button
                onClick={onClearToRealDb}
                className="hidden xl:flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
                title="ล้างข้อมูลตัวอย่างทั้งหมด ให้เป็นฐานข้อมูลว่างเปล่าตาม 10.2.0.201"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>ล้างข้อมูลให้ว่างตาม 10.2.0.201</span>
              </button>
            )
          )}

          {/* Scanners Status Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            <span className="text-slate-500">CMiF68S:</span>
            <span className="font-semibold text-slate-700">
              {onlineCount}/{scanners.length} เครื่อง
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>

          {/* Pending Records in Staging */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>รอส่งเข้า hosoffice:</span>
              <span className="font-bold tabular-nums font-mono text-amber-900">{pendingCount}</span>
              <span className="text-[11px] text-amber-600 font-normal">รายการ</span>
            </div>
          )}

          {/* Sync From Scanner button (ADMIN only) */}
          {isAdmin && (
            <button
              onClick={onSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              title="ดึง Log จากเครื่องสแกน HIP CMiF68S เข้าสู่ Staging DB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจากสแกนเนอร์'}</span>
            </button>
          )}

        </div>
      </header>

      {/* Database & Data Source Explanation Modal */}
      <DatabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        state={state}
        onClearToRealDb={onClearToRealDb}
        onLoadDemoData={onLoadDemoData}
      />
    </>
  );
};
