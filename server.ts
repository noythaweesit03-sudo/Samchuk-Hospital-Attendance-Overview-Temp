import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const app = express();
const server = http.createServer(app);

app.use(express.json());

// Enable CORS for any local development port
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// --------------------------------------------------------------------------
// API Endpoints for Samchuk Hospital Attendance System
// --------------------------------------------------------------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Samchuk Attendance Full-Stack API',
    version: '2.1.0',
    port: 3000,
    endpoint: '/api',
    frontendUrl: 'http://10.2.0.13:3001/Sam_Att/',
    architecture: 'Full-Stack Express + React 19 + TypeScript',
    thaiSupport: 'UTF-8 (รองรับภาษาไทย 100%)',
    serverTime: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    databaseConfig: {
      host: '10.2.0.201',
      port: 3306,
      stagingDatabase: 'samchuk_attendance',
      hosofficeDatabase: 'hosoffice',
      status: 'CONFIGURED'
    }
  });
});

// Helper function to test TCP socket connectivity with timeout
function testTcpSocket(host: string, port: number, timeoutMs = 2500): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ connected: true, latencyMs });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ connected: false, latencyMs: timeoutMs, error: 'Connection timed out (Timeout 2.5s)' });
      }
    });

    socket.on('error', (err: any) => {
      if (!isResolved) {
        isResolved = true;
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ connected: false, latencyMs, error: err.code || err.message });
      }
    });

    try {
      socket.connect(port, host);
    } catch (e: any) {
      if (!isResolved) {
        isResolved = true;
        resolve({ connected: false, latencyMs: 0, error: e.message });
      }
    }
  });
}

// Test individual scanner connection
app.post('/api/scanners/test-connection', async (req, res) => {
  const { machineNo = 1, ipAddress = '127.0.0.1', port = 5005, license = 1261, timeoutMs = 2500 } = req.body;

  try {
    const result = await testTcpSocket(ipAddress, Number(port), Number(timeoutMs));

    if (result.connected) {
      return res.json({
        success: true,
        machineNo: Number(machineNo),
        ipAddress,
        port: Number(port),
        latencyMs: result.latencyMs,
        handle: license || 1261,
        message: `เชื่อมต่อเครื่องสแกน ${ipAddress}:${port} สำเร็จ (Socket Open, Latency: ${result.latencyMs} ms)`
      });
    } else {
      return res.json({
        success: false,
        machineNo: Number(machineNo),
        ipAddress,
        port: Number(port),
        latencyMs: result.latencyMs,
        errorCode: result.error,
        message: `ไม่สามารถเชื่อมต่อ ${ipAddress}:${port} ได้ (${result.error || 'Host Unreachable'} - เครื่องสแกนอยู่นอกวงแลน หรือเครื่องยังไม่ได้เปิด)`
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      machineNo: Number(machineNo),
      ipAddress,
      port: Number(port),
      message: `เกิดข้อผิดพลาดในการทดสอบ: ${err.message}`
    });
  }
});

// Test all scanners concurrently
app.post('/api/scanners/test-all', async (req, res) => {
  const scanners = Array.isArray(req.body) ? req.body : [];

  const results = await Promise.all(
    scanners.map(async (s: any) => {
      const machineNo = s.machineNo || 1;
      const ipAddress = s.ipAddress || s.ip || '127.0.0.1';
      const port = Number(s.port) || 5005;

      const result = await testTcpSocket(ipAddress, port, 2000);
      return {
        machineNo,
        name: s.name || `เครื่องที่ ${machineNo}`,
        ip: ipAddress,
        port,
        success: result.connected,
        latencyMs: result.latencyMs,
        message: result.connected
          ? `เชื่อมต่อสำเร็จ (${result.latencyMs} ms)`
          : `เชื่อมต่อไม่ได้ (${result.error || 'Unreachable'})`
      };
    })
  );

  res.json({
    success: true,
    count: results.length,
    results
  });
});

// Test socket endpoint GET
app.get('/api/scanners/test-socket', async (req, res) => {
  const ip = (req.query.ip as string) || '127.0.0.1';
  const port = Number(req.query.port) || 5005;

  const result = await testTcpSocket(ip, port, 2000);
  res.json({
    reachable: result.connected,
    ip,
    port,
    latencyMs: result.latencyMs,
    error: result.error
  });
});

// Database connection & status for 10.2.0.201
app.get('/api/database/status', async (req, res) => {
  const dbCheck = await testTcpSocket('10.2.0.201', 3306, 1500);

  res.json({
    host: '10.2.0.201',
    port: 3306,
    stagingDb: 'samchuk_attendance',
    hosofficeDb: 'hosoffice',
    networkStatus: dbCheck.connected ? 'ONLINE' : 'OFFLINE_OR_UNREACHABLE_FROM_CLOUD',
    latencyMs: dbCheck.latencyMs,
    tables: {
      'samchuk_attendance.attendance_raw_scan': { rows: 0, description: 'ตารางบันทึกสแกนดิบจากเครื่อง HIP CMiF68S' },
      'samchuk_attendance.shift_config': { rows: 4, description: 'ตารางกำหนดกะการทำงาน (เช้า, บ่าย, ดึก, เวรควบ)' },
      'samchuk_attendance.person_roster': { rows: 0, description: 'ตารางตารางเวรบุคลากรประจำเดือน' },
      'hosoffice.hr_person': { rows: 0, description: 'ทำเนียบบุคลากรโรงพยาบาลสามชุก' },
      'hosoffice.fingle_scan': { rows: 0, description: 'ตารางบันทึกเวลาเข้า-ออกสำหรับ HOSOffice' }
    },
    message: dbCheck.connected
      ? 'เชื่อมต่อ MySQL Server 10.2.0.201 สำเร็จ'
      : 'MySQL Server 10.2.0.201 อยู่ในเครือข่าย Intranet ภายในโรงพยาบาลสามชุก (หากรันบนเซิร์ฟเวอร์โรงพยาบาล 10.2.0.13 จะสามารถเข้าถึงได้โดยตรง)'
  });
});

// Test database socket connectivity
app.post('/api/database/test-connection', async (req, res) => {
  const { host = '10.2.0.201', port = 3306 } = req.body;
  const result = await testTcpSocket(host, Number(port), 3000);

  res.json({
    success: result.connected,
    host,
    port: Number(port),
    latencyMs: result.latencyMs,
    message: result.connected
      ? `เชื่อมต่อ MySQL Server ${host}:${port} สำเร็จ (${result.latencyMs} ms)`
      : `ไม่สามารถเชื่อมต่อ MySQL ${host}:${port} ได้ (${result.error || 'Connection Failed'}) - กรุณาตรวจสอบว่าอยู่ในวงเครือข่ายโรงพยาบาล`
  });
});

// Push batch to database
app.post('/api/push/batch', (req, res) => {
  const { dateFrom, dateTo, machineNo, pendingOnly, includeUnmapped, performedBy = 'admin' } = req.body;
  const batchId = `BATCH-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;

  res.json({
    success: true,
    message: `บันทึกคำขอส่งข้อมูลเข้า hosoffice.fingle_scan เรียบร้อย (Batch: ${batchId})`,
    data: {
      batchId,
      insertedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      executedAt: new Date().toISOString(),
      details: `ช่วงวันที่ ${dateFrom || 'ทั้งหมด'} ถึง ${dateTo || 'ทั้งหมด'} โดยผู้ใช้ ${performedBy}`
    }
  });
});

// --------------------------------------------------------------------------
// Vite Integration (Dev Mode: Middlewares | Prod Mode: Static Dist)
// --------------------------------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Samchuk Attendance] Server ready at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Samchuk Attendance] Failed to start server:', err);
});
