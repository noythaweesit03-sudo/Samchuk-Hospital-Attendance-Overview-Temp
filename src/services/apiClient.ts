/**
 * API Client สำหรับเชื่อมต่อระบบหลังบ้านโรงพยาบาลสามชุก (Samchuk Attendance API)
 * รองรับทั้ง:
 * 1. Full-Stack Express API ภายในเว็บ (พอร์ต 3000 /api/*)
 * 2. C# ASP.NET Core 10 / Windows Service (พอร์ต 3002 บน 10.2.0.13)
 * 3. Fallback และการตรวจสอบความถูกต้องของข้อมูล (Graceful Non-JSON Handling)
 */

export interface ApiHealthResponse {
  status: string;
  service: string;
  version: string;
  port: number;
  endpoint: string;
  frontendUrl: string;
  architecture: string;
  thaiSupport: string;
  serverTime: string;
  databaseConfig?: {
    host: string;
    port: number;
    stagingDatabase: string;
    hosofficeDatabase: string;
    status: string;
  };
}

export interface ApiPushBatchPayload {
  dateFrom?: string;
  dateTo?: string;
  machineNo?: number;
  pendingOnly?: boolean;
  includeUnmapped?: boolean;
  performedBy?: string;
}

export interface ApiPushBatchResponse {
  success: boolean;
  message: string;
  data?: {
    batchId: string;
    insertedCount: number;
    skippedCount: number;
    failedCount: number;
    executedAt: string;
    details?: string;
  };
}

const STORAGE_API_KEY = 'samchuk_api_endpoint_url';

export const resolveDefaultApiUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default to relative "" so it always routes to the same origin (Express Fullstack on Port 3000)
  return '';
};

export const DEFAULT_API_URL = resolveDefaultApiUrl();
export const HOSPITAL_WEB_URL = 'http://10.2.0.13:3001/Sam_Att/';

class ApiClientService {
  private customBaseUrl: string = resolveDefaultApiUrl();
  private isOnline: boolean = false;
  private lastPingMs: number = 0;
  private lastCheckTime: string = '';
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_API_KEY);
      if (saved !== null) {
        // If saved is 10.2.0.13:3002 and user experienced 404, we allow it, but if it was the old default, normalize
        this.customBaseUrl = saved.trim();
      } else {
        this.customBaseUrl = resolveDefaultApiUrl();
      }
    }
  }

  public getBaseUrl(): string {
    return this.customBaseUrl;
  }

  public setBaseUrl(url: string) {
    this.customBaseUrl = url.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_API_KEY, this.customBaseUrl);
    }
    this.notify();
    this.checkHealth();
  }

  public resetToDefault() {
    this.setBaseUrl(DEFAULT_API_URL);
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('Error in API listener', e);
      }
    });
  }

  public getStatus() {
    return {
      baseUrl: this.customBaseUrl || '(Built-in Full-Stack API / พอร์ต 3000)',
      isOnline: this.isOnline,
      lastPingMs: this.lastPingMs,
      lastCheckTime: this.lastCheckTime,
      frontendUrl: HOSPITAL_WEB_URL,
      apiPort: this.customBaseUrl.includes(':3002') ? 3002 : 3000,
      frontendPort: 3001
    };
  }

  private getFullUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!this.customBaseUrl) {
      return cleanPath;
    }
    return `${this.customBaseUrl}${cleanPath}`;
  }

  /**
   * Helper to safely parse JSON or return structured error
   */
  private async safeJsonParse(res: Response): Promise<{ isJson: boolean; data: any; text: string }> {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (contentType.includes('application/json')) {
      try {
        const data = JSON.parse(text);
        return { isJson: true, data, text };
      } catch {
        return { isJson: false, data: null, text };
      }
    }
    return { isJson: false, data: null, text };
  }

  /**
   * ทดสอบการเชื่อมต่อ API (GET /api/health)
   */
  public async checkHealth(): Promise<{ online: boolean; latencyMs: number; data?: ApiHealthResponse; error?: string }> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const targetUrl = this.getFullUrl('/api/health');

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - start);
      this.lastPingMs = elapsed;
      this.lastCheckTime = new Date().toLocaleTimeString('th-TH');

      const parsed = await this.safeJsonParse(res);

      if (res.ok && parsed.isJson) {
        this.isOnline = true;
        this.notify();
        return { online: true, latencyMs: elapsed, data: parsed.data };
      } else {
        this.isOnline = false;
        this.notify();
        return {
          online: false,
          latencyMs: elapsed,
          error: `HTTP ${res.status}: ${res.statusText}${parsed.isJson ? ` - ${JSON.stringify(parsed.data)}` : ' (เซิร์ฟเวอร์ยังไม่ได้เปิดพอร์ตนี้)'}`
        };
      }
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      this.isOnline = false;
      this.lastPingMs = elapsed;
      this.lastCheckTime = new Date().toLocaleTimeString('th-TH');
      this.notify();
      const msg = err instanceof Error ? err.message : 'Cannot connect to API';
      return { online: false, latencyMs: elapsed, error: msg };
    }
  }

  /**
   * ส่ง Batch ไปยัง API (POST /api/push/batch)
   */
  public async pushBatch(payload: ApiPushBatchPayload): Promise<ApiPushBatchResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const targetUrl = this.getFullUrl('/api/push/batch');

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const parsed = await this.safeJsonParse(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }

      throw new Error(`API Error (${res.status}): ${parsed.isJson ? parsed.data?.message : 'ไม่สามารถส่งข้อมูลได้'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ API';
      throw new Error(msg);
    }
  }

  /**
   * สั่งเครื่องสแกนดึงข้อมูลทันที
   */
  public async testScannerSocket(ip: string, port: number = 5005) {
    try {
      const targetUrl = this.getFullUrl(`/api/scanners/test-socket?ip=${encodeURIComponent(ip)}&port=${port}`);
      const res = await fetch(targetUrl);
      const parsed = await this.safeJsonParse(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
      return {
        reachable: false,
        ip,
        port,
        error: `HTTP ${res.status}`
      };
    } catch (err: unknown) {
      return {
        reachable: false,
        ip,
        port,
        error: err instanceof Error ? err.message : 'Connection failed'
      };
    }
  }

  /**
   * ทดสอบเชื่อมต่อเครื่องสแกนผ่าน POST /api/scanners/test-connection
   * แก้ไขปัญหา Unexpected token '<' โดยการ safe-parse JSON เสมอ
   */
  public async testScannerConnection(req: { machineNo: number; ipAddress: string; port?: number; license?: number }) {
    try {
      const targetUrl = this.getFullUrl('/api/scanners/test-connection');
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          machineNo: req.machineNo,
          ipAddress: req.ipAddress,
          port: req.port || 5005,
          license: req.license || 1261,
          timeoutMs: 3000
        })
      });

      const parsed = await this.safeJsonParse(res);

      if (res.ok && parsed.isJson) {
        return parsed.data;
      }

      // If backend returned 404 or HTML (e.g. invalid endpoint), provide a clear, non-crashing Thai message
      return {
        success: false,
        ipAddress: req.ipAddress,
        port: req.port || 5005,
        message: `Endpoint ${targetUrl} ตอบกลับสถานะ HTTP ${res.status} (ไม่ใช่ JSON) - กรุณาตรวจสอบว่า API เซิร์ฟเวอร์เปิดใช้งานอยู่`
      };
    } catch (err: unknown) {
      return {
        success: false,
        ipAddress: req.ipAddress,
        port: req.port || 5005,
        message: (err instanceof Error && err.message !== 'Failed to fetch')
          ? err.message
          : `ไม่สามารถติดต่อ Backend API ที่ ${this.customBaseUrl || 'พอร์ต 3000'} ได้ (กรุณาตรวจสอบว่า Service ทำงานอยู่หรือไม่)`
      };
    }
  }

  /**
   * ทดสอบทุกเครื่องพร้อมกันผ่าน POST /api/scanners/test-all
   */
  public async testAllScanners(scanners: Array<{ machineNo: number; ipAddress: string; port?: number; license?: number }>) {
    try {
      const targetUrl = this.getFullUrl('/api/scanners/test-all');
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(scanners)
      });

      const parsed = await this.safeJsonParse(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }

      return {
        success: false,
        message: `Endpoint ${targetUrl} ตอบกลับ HTTP ${res.status}`
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: (err instanceof Error && err.message !== 'Failed to fetch')
          ? err.message
          : `ไม่สามารถติดต่อ Backend API ที่ ${this.customBaseUrl || 'พอร์ต 3000'} ได้`
      };
    }
  }

  /**
   * ดึงสถานะฐานข้อมูล 10.2.0.201
   */
  public async getDatabaseStatus() {
    try {
      const targetUrl = this.getFullUrl('/api/database/status');
      const res = await fetch(targetUrl);
      const parsed = await this.safeJsonParse(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClientService();
