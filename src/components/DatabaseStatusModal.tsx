import React, { useState } from 'react';
import { Database, Server, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Copy, Check, X, ShieldAlert, Cpu } from 'lucide-react';
import { StoreState } from '../services/attendanceStore';
import { apiClient } from '../services/apiClient';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: StoreState;
  onClearToRealDb: () => void;
  onLoadDemoData: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  state,
  onClearToRealDb,
  onLoadDemoData
}) => {
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestDatabase = async () => {
    setTestingDb(true);
    setDbTestResult(null);

    try {
      const res = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: '10.2.0.201', port: 3306 })
      });
      const data = await res.json();
      setDbTestResult(data);
    } catch {
      setDbTestResult({
        success: false,
        message: 'ไม่สามารถติดต่อ Backend API เพื่อทดสอบ Socket 10.2.0.201 ได้'
      });
    } finally {
      setTestingDb(false);
    }
  };

  const sampleDdl = `-- โครงสร้างตาราง samchuk_attendance บน MySQL 10.2.0.201
CREATE DATABASE IF NOT EXISTS samchuk_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE samchuk_attendance;

-- 1. ตารางสแกนดิบจากเครื่อง HIP CMiF68S
CREATE TABLE IF NOT EXISTS attendance_raw_scan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  fingle_id INT NOT NULL,
  person_id INT NULL,
  machine_no INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  scan_date_time DATETIME NOT NULL,
  verify_mode INT DEFAULT 1,
  in_out_mode INT DEFAULT 1,
  push_status ENUM('PENDING', 'PUSHED', 'FAILED', 'SKIPPED') DEFAULT 'PENDING',
  pushed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fingle_time (fingle_id, scan_date_time),
  INDEX idx_push_status (push_status)
);

-- 2. ตารางกะการทำงานมาตรฐาน
CREATE TABLE IF NOT EXISTS shift_config (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_grace_minutes INT DEFAULT 0,
  is_cross_day BOOLEAN DEFAULT FALSE
);`;

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(sampleDdl);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isRealEmpty = state.dataSourceMode === 'REAL_EMPTY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                สถานะฐานข้อมูลและแหล่งข้อมูล (Database & Data Mode)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                MySQL Host: 10.2.0.201:3306 | samchuk_attendance & hosoffice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Explanation Box for User's Question */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ทำไมก่อนหน้านี้ในเว็บยังมีข้อมูล ทั้งที่ฐานข้อมูล 10.2.0.201 ยังไม่มีข้อมูล?</span>
            </div>
            <p className="leading-relaxed text-amber-900/90">
              ระบบเริ่มต้นด้วย <strong>"ชุดข้อมูลจำลองเพื่อการทดสอบ (Demo Mode)"</strong> จำนวน 150 รายการ เพื่อให้เจ้าหน้าที่สามารถเปิดทดลองดูหน้าตา รายงานประจำเดือน กราฟแดชบอร์ด และการคำนวณกะเวรได้ทันทีก่อนที่จะเริ่มเชื่อมต่อฐานข้อมูลจริงของโรงพยาบาล
            </p>
            <p className="font-semibold text-amber-800">
              👉 หากต้องการให้หน้าเว็บแสดงผลตรงตามฐานข้อมูลจริง 10.2.0.201 ซึ่งขณะนี้ว่างเปล่า (0 รายการ) ให้กดปุ่มด้านล่างนี้:
            </p>
          </div>

          {/* Mode Switch Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                onClearToRealDb();
                onClose();
              }}
              className={`p-3.5 rounded-xl border flex flex-col items-start gap-1.5 text-left transition-all cursor-pointer ${
                isRealEmpty
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>โหมดฐานข้อมูลจริง (10.2.0.201)</span>
                </span>
                {isRealEmpty && (
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    ใช้งานอยู่
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                ล้างข้อมูลตัวอย่างออกทั้งหมด หน้าเว็บจะแสดง <strong>0 รายการ</strong> ตรงตามฐานข้อมูลปัจจุบันบนเครื่อง 10.2.0.201
              </p>
            </button>

            <button
              onClick={() => {
                onLoadDemoData();
                onClose();
              }}
              className={`p-3.5 rounded-xl border flex flex-col items-start gap-1.5 text-left transition-all cursor-pointer ${
                !isRealEmpty
                  ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-teal-600" />
                  <span>โหมดข้อมูลจำลอง (Demo Mode)</span>
                </span>
                {!isRealEmpty && (
                  <span className="text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">
                    ใช้งานอยู่
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                โหลดข้อมูลสแกนตัวอย่าง (150 รายการ) เพื่อทดสอบฟังก์ชันรายงาน การจัดกะเวร และการคำนวณ OT
              </p>
            </button>
          </div>

          {/* Table Counts Comparison */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>จำนวนแถวในแต่ละตาราง (Table Inventory Status)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Host: 10.2.0.201:3306
              </span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">ชื่อตาราง / ฐานข้อมูล</th>
                  <th className="text-left px-4 py-2 font-medium">บทบาทในระบบ</th>
                  <th className="text-right px-4 py-2 font-medium">จำนวนในเว็บปัจจุบัน</th>
                  <th className="text-right px-4 py-2 font-medium">ในเครื่อง 10.2.0.201</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="px-4 py-2 font-semibold text-teal-900 font-sans">
                    samchuk_attendance.attendance_raw_scan
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-sans">บันทึกสแกนดิบจาก HIP CMiF68S</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-800">{state.rawScans.length} แถว</td>
                  <td className="px-4 py-2 text-right text-rose-600 font-bold">0 แถว</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-semibold text-teal-900 font-sans">
                    hosoffice.hr_person
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-sans">ทำเนียบบุคลากร รพ.สามชุก</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-800">{state.personnel.length} แถว</td>
                  <td className="px-4 py-2 text-right text-slate-600 font-bold">รอซิงค์</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-semibold text-teal-900 font-sans">
                    samchuk_attendance.shift_config
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-sans">กะมาตรฐาน (เช้า, บ่าย, ดึก, ควบ)</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-800">{state.shifts.length} กะ</td>
                  <td className="px-4 py-2 text-right text-slate-600 font-bold">4 กะ</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-semibold text-teal-900 font-sans">
                    hosoffice.fingle_scan
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-sans">ตารางปลายทาง HOSOffice</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-800">{state.hosofficeScans.length} แถว</td>
                  <td className="px-4 py-2 text-right text-rose-600 font-bold">0 แถว</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Test MySQL Connection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">ทดสอบการเชื่อมต่อเครือข่ายไปยัง MySQL 10.2.0.201</span>
                <p className="text-[11px] text-slate-500">ตรวจสอบ TCP Socket พอร์ต 3306</p>
              </div>
              <button
                onClick={handleTestDatabase}
                disabled={testingDb}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                <span>{testingDb ? 'กำลังทดสอบ...' : 'ทดสอบ Ping 10.2.0.201'}</span>
              </button>
            </div>

            {dbTestResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                dbTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{dbTestResult.message}</span>
              </div>
            )}
          </div>

          {/* DDL SQL Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                คำสั่ง SQL สำหรับเตรียมตารางบนเครื่อง 10.2.0.201:
              </span>
              <button
                onClick={handleCopyDdl}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'คัดลอก SQL แล้ว' : 'คัดลอก SQL DDL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-teal-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-36 border border-slate-800">
              {sampleDdl}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
