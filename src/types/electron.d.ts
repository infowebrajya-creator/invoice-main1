export interface NativePrinterInfo {
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  status: number;
}

export interface ElectronApi {
  isElectron: boolean;
  platform: string;
  getPrinters: () => Promise<NativePrinterInfo[]>;
  printSilent: (options: {
    html: string;
    printerName?: string;
    deviceName?: string;
    is80mm?: boolean;
    pageSize?: any;
  }) => Promise<{ success: boolean; error?: string }>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronApi;
  }
}
