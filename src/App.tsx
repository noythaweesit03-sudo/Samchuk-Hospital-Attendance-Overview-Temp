import { useState, useEffect } from 'react';
import { attendanceStore, StoreState } from './services/attendanceStore';
import { Navigation, NavTab } from './components/Navigation';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { PushToHosofficePage } from './pages/PushToHosofficePage';
import { ShiftsAndRosterPage } from './pages/ShiftsAndRosterPage';
import { RawScansPage } from './pages/RawScansPage';
import { AttendancePage } from './pages/AttendancePage';
import { ScannersPage } from './pages/ScannersPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { SystemAndLogsPage } from './pages/SystemAndLogsPage';
import { MonthlyReportPage } from './pages/MonthlyReportPage';
import { MyAttendancePage } from './pages/MyAttendancePage';
import { User } from './types/attendance';

export default function App() {
  const [storeState, setStoreState] = useState<StoreState>(attendanceStore.getState());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = attendanceStore.subscribe(() => {
      setStoreState({ ...attendanceStore.getState() });
    });
    return unsubscribe;
  }, []);

  // Background auto-sync simulation (only in Demo Mode)
  useEffect(() => {
    const timer = setInterval(() => {
      if (storeState.autoSyncEnabled && storeState.dataSourceMode === 'DEMO') {
        attendanceStore.triggerScannerSync();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [storeState.autoSyncEnabled, storeState.dataSourceMode]);

  // Handle manual sync action
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const res = attendanceStore.triggerScannerSync();
      setIsSyncing(false);
      if (res.totalNew > 0) {
        showToast(`⚡ บันทึกสแกนดิบ (+${res.totalNew} รายการ) และประมวลผลเวลา (${res.processedCount} คน) สำเร็จ!`);
      } else {
        showToast(`ℹ️ สแกนเนอร์ไม่มีข้อมูลใหม่ หรือระบบอยู่ในโหมดฐานข้อมูลจริง (ยังไม่มีรายชื่อบุคลากร)`);
      }
    }, 500);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUserChange = (user: User) => {
    attendanceStore.setCurrentUser(user);
    if (user.role === 'USER') {
      setCurrentTab('my_attendance');
    }
    showToast(`สลับผู้ใช้งานเป็น: ${user.fullname} (${user.role})`);
  };

  const handleClearToRealDb = () => {
    attendanceStore.clearToRealDbState();
    showToast('ล้างข้อมูลตัวอย่างแล้ว: กำลังแสดงสถานะฐานข้อมูลจริง 10.2.0.201 (0 รายการ)');
  };

  const handleLoadDemoData = () => {
    attendanceStore.loadDemoData();
    showToast('โหลดข้อมูลตัวอย่าง (150 รายการ) เพื่อทดสอบระบบเรียบร้อย');
  };

  const pendingPushCount = storeState.rawScans.filter(s => s.pushStatus === 'PENDING').length;

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'แดชบอร์ดภาพรวมการลงเวลา',
      subtitle: 'Samchuk Hospital Attendance Overview & Real-time Telemetry'
    },
    push: {
      title: 'ส่งข้อมูลเข้า MySQL hosoffice (Manual Push)',
      subtitle: 'ตรวจสอบและยืนยันการส่งข้อมูลเข้าตาราง hosoffice.fingle_scan'
    },
    shifts: {
      title: 'จัดการกะการทำงานและตารางเวร (Shifts & Roster)',
      subtitle: 'แก้ไขเวลากะเช้า/บ่าย/ดึก/เช้าควบบ่าย, จัดกลุ่มบุคลากร และ Override'
    },
    raw_scans: {
      title: 'บันทึกสแกนดิบ (Raw Scans Staging DB)',
      subtitle: 'ตาราง attendance_raw_scan ข้อมูลจริงจาก HIP CMiF68S'
    },
    attendance: {
      title: 'ผลการประมวลผลเวลาปฏิบัติงาน (Attendance Calculation)',
      subtitle: 'คำนวณการเข้าตรงเวลา สาย ออกก่อน และ OT ตามลำดับความสำคัญของกะ'
    },
    monthly_report: {
      title: 'รายงานสรุปประจำเดือนสำหรับฝ่ายบุคคล/การเงิน (Monthly HR Attendance Report)',
      subtitle: 'สรุปยอดวันทำงาน, มาสาย, ออกก่อน, OT สะสม และพิมพ์รายงาน/ส่งออก Excel'
    },
    my_attendance: {
      title: 'เวลาทำงานและตารางเวรของฉัน (My Attendance & Roster)',
      subtitle: 'ตรวจสอบสถานะสแกนนิ้ววันนี้, ตารางเวรที่ได้รับมอบหมาย และประวัติการลงเวลาส่วนบุคคล'
    },
    scanners: {
      title: 'จัดการเครื่องสแกนนิ้วมือ (CMiF68S Scanners)',
      subtitle: 'ทดสอบการเชื่อมต่อ FK_ConnectNet และสั่ง Sync ผ่าน Native DLL'
    },
    personnel: {
      title: 'ทำเนียบบุคลากรและรหัสสแกนนิ้ว (HR Directory)',
      subtitle: 'อ่านข้อมูลอย่างเดียวจากตาราง hosoffice.hr_person'
    },
    system: {
      title: 'ระบบ สถาปัตยกรรม และประวัติการทำงาน (System & Logs)',
      subtitle: 'Sync Logs, Audit Trails, MySQL DDL Schemas, และ C# ASP.NET Core 10'
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentUser={storeState.currentUser}
        onUserChange={handleUserChange}
        allUsers={storeState.users}
        pendingPushCount={pendingPushCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          title={tabTitles[currentTab].title}
          subtitle={tabTitles[currentTab].subtitle}
          currentUser={storeState.currentUser}
          scanners={storeState.scanners}
          pendingCount={pendingPushCount}
          onSyncClick={handleTriggerSync}
          isSyncing={isSyncing}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          state={storeState}
          onClearToRealDb={handleClearToRealDb}
          onLoadDemoData={handleLoadDemoData}
        />

        {/* Informative Data Mode Banner (Directly answers why 10.2.0.201 is empty while web has data) */}
        {storeState.dataSourceMode === 'DEMO' ? (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-bold">กำลังแสดงชุดข้อมูลตัวอย่าง (Demo Mode: 150 รายการ):</span>
              <span className="hidden lg:inline text-amber-800">
                เนื่องจากในฐานข้อมูล 10.2.0.201 samchuk_attendance ยังไม่มีข้อมูล ระบบจึงแสดงตัวอย่างเพื่อให้ทดสอบดูรายงานได้ทันที
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearToRealDb}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
              >
                ล้างข้อมูลให้ว่างเปล่าตามฐานข้อมูล 10.2.0.201
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold">โหมดฐานข้อมูลจริง (MySQL 10.2.0.201):</span>
              <span className="text-emerald-800">
                ขณะนี้ใน samchuk_attendance มี {storeState.rawScans.length} รายการ (สถานะตรงตามฐานข้อมูลจริง)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadDemoData}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[11px] cursor-pointer transition-colors"
              >
                โหลดข้อมูลตัวอย่าง (Demo) เพื่อทดสอบ
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Page View */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentTab === 'dashboard' && (
            <DashboardPage
              state={storeState}
              onNavigate={setCurrentTab}
              onSync={handleTriggerSync}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === 'push' && (
            <PushToHosofficePage state={storeState} />
          )}

          {currentTab === 'shifts' && (
            <ShiftsAndRosterPage state={storeState} />
          )}

          {currentTab === 'raw_scans' && (
            <RawScansPage
              state={storeState}
              onSync={handleTriggerSync}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === 'attendance' && (
            <AttendancePage state={storeState} />
          )}

          {currentTab === 'monthly_report' && (
            <MonthlyReportPage state={storeState} />
          )}

          {currentTab === 'my_attendance' && (
            <MyAttendancePage state={storeState} />
          )}

          {currentTab === 'scanners' && (
            <ScannersPage
              state={storeState}
              onSync={handleTriggerSync}
              isSyncing={isSyncing}
            />
          )}

          {currentTab === 'personnel' && (
            <PersonnelPage state={storeState} />
          )}

          {currentTab === 'system' && (
            <SystemAndLogsPage state={storeState} />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-teal-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
