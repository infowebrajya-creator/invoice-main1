import { Invoice, ShopProfile, PrintSettings } from '../types';
import { build80mmEscPos, buildTestReceiptEscPos, EscPosBuilder } from './escpos';

export interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
  packetSize: number;
}

export interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName?: string;
  endpoints: USBEndpoint[];
}

export interface USBInterface {
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  alternates: USBAlternateInterface[];
  claimed: boolean;
}

export interface USBConfiguration {
  configurationValue: number;
  configurationName?: string;
  interfaces: USBInterface[];
}

export interface USBDevice {
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  opened: boolean;
  configuration: USBConfiguration | null;
  configurations: USBConfiguration[];
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
}

// Store active USB / Serial device in-memory
let activeUsbDevice: USBDevice | null = null;
let activeUsbEndpoint: number = 1;
let activeSerialPort: any = null;

export interface UsbPrinterStatus {
  isSupported: boolean;
  isConnected: boolean;
  deviceName: string | null;
  connectionType: 'webusb' | 'serial' | 'none';
}

/**
 * Check if WebUSB or Web Serial is supported in the current browser
 */
export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && ('usb' in navigator || 'serial' in navigator);
}

/**
 * Check if an active USB/Serial printer is currently connected and open
 */
export function isUsbPrinterConnected(): boolean {
  if (activeUsbDevice && activeUsbDevice.opened) return true;
  if (activeSerialPort && activeSerialPort.readable) return true;
  return false;
}

/**
 * Get current printer connection status
 */
export function getUsbPrinterStatus(): UsbPrinterStatus {
  const supported = isWebUsbSupported();
  if (activeUsbDevice && activeUsbDevice.opened) {
    return {
      isSupported: supported,
      isConnected: true,
      deviceName: activeUsbDevice.productName || 'USB Thermal POS-80 Printer',
      connectionType: 'webusb'
    };
  }
  if (activeSerialPort) {
    return {
      isSupported: supported,
      isConnected: true,
      deviceName: 'USB Virtual Serial Printer',
      connectionType: 'serial'
    };
  }
  return {
    isSupported: supported,
    isConnected: false,
    deviceName: null,
    connectionType: 'none'
  };
}

/**
 * Connect to a specific USBDevice, claim printer interface and locate the OUT endpoint
 */
async function connectToUsbDevice(device: USBDevice): Promise<{ success: boolean; error?: string }> {
  try {
    if (!device.opened) {
      await device.open();
    }

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Find the printer interface (Class 7) or first available interface
    let interfaceNumber = 0;
    let endpointNumber = 1;

    for (const conf of device.configurations) {
      for (const iface of conf.interfaces) {
        for (const alt of iface.alternates) {
          // Look for Bulk OUT endpoint
          const outEp = alt.endpoints.find(
            (ep) => ep.direction === 'out' && ep.type === 'bulk'
          );
          if (outEp) {
            interfaceNumber = iface.interfaceNumber;
            endpointNumber = outEp.endpointNumber;
            break;
          }
        }
      }
    }

    await device.claimInterface(interfaceNumber);
    activeUsbDevice = device;
    activeUsbEndpoint = endpointNumber;

    return { success: true };
  } catch (err: any) {
    console.error('[WebUSB] Connection error:', err);
    return { success: false, error: err.message || 'Failed to claim USB interface' };
  }
}

/**
 * Prompt user to select a USB thermal receipt printer
 */
export async function pairUsbPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!('usb' in navigator)) {
    return { success: false, error: 'WebUSB API is not supported in this browser. Please use Google Chrome.' };
  }

  try {
    // Request device: Class 7 is USB Printer. If empty or filtered, allow user to pick.
    let device: USBDevice;
    try {
      device = await (navigator as any).usb.requestDevice({
        filters: [{ classCode: 7 }] // USB Printer class
      });
    } catch {
      // Fallback: show all connected USB devices
      device = await (navigator as any).usb.requestDevice({
        filters: []
      });
    }

    const connectRes = await connectToUsbDevice(device);
    if (!connectRes.success) {
      return { success: false, error: connectRes.error };
    }

    const name = device.productName || 'USB Thermal POS-80';
    try {
      localStorage.setItem('webrajya_paired_usb_name', name);
    } catch {
      // ignore
    }

    return { success: true, deviceName: name };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: 'No printer selected.' };
    }
    return { success: false, error: err.message || 'Failed to pair USB printer' };
  }
}

/**
 * Attempt to auto-reconnect to a previously paired USB printer on page load
 */
export async function autoReconnectUsbPrinter(): Promise<boolean> {
  if (!('usb' in navigator)) return false;

  try {
    const devices = await (navigator as any).usb.getDevices();
    if (devices.length > 0) {
      // Pick first paired printer
      const connectRes = await connectToUsbDevice(devices[0]);
      if (connectRes.success) {
        console.log('[WebUSB] Auto-reconnected to paired printer:', devices[0].productName);
        return true;
      }
    }
  } catch (err) {
    console.warn('[WebUSB] Auto-reconnect failed:', err);
  }
  return false;
}

/**
 * Send raw binary ESC/POS data buffer directly to the connected USB printer
 */
export async function sendEscPosToUsb(data: Uint8Array): Promise<{ success: boolean; error?: string }> {
  // If not open, try auto-reconnect
  if (!isUsbPrinterConnected()) {
    const reconnected = await autoReconnectUsbPrinter();
    if (!reconnected) {
      return { success: false, error: 'USB printer is not connected. Please pair it in Settings.' };
    }
  }

  if (activeUsbDevice && activeUsbDevice.opened) {
    try {
      // Chunk into 64-byte or 512-byte packets to prevent USB buffer overrun on budget POS printers
      const chunkSize = 512;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        const slice = data.slice(offset, offset + chunkSize);
        await activeUsbDevice.transferOut(activeUsbEndpoint, slice);
      }
      return { success: true };
    } catch (err: any) {
      console.error('[WebUSB] Write failed:', err);
      return { success: false, error: err.message || 'Failed to transmit data to USB printer' };
    }
  }

  if (activeSerialPort && activeSerialPort.writable) {
    try {
      const writer = activeSerialPort.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return { success: true };
    } catch (err: any) {
      console.error('[WebSerial] Write failed:', err);
      return { success: false, error: err.message || 'Failed to transmit data via Serial' };
    }
  }

  return { success: false, error: 'No active USB printer pipeline available' };
}

/**
 * High-Level Silent Print: Encodes invoice to ESC/POS and sends directly to USB
 */
export async function printInvoiceSilentUsb(
  invoice: Invoice,
  shop: ShopProfile,
  printSettings?: PrintSettings
): Promise<{ success: boolean; error?: string }> {
  const binaryData = build80mmEscPos(invoice, shop, printSettings);
  return await sendEscPosToUsb(binaryData);
}

/**
 * Send a test print receipt to verify hardware communication
 */
export async function testUsbPrinter(shopName: string = 'WEBRAJYA POS'): Promise<{ success: boolean; error?: string }> {
  const testData = buildTestReceiptEscPos(shopName);
  return await sendEscPosToUsb(testData);
}

/**
 * Trigger an immediate test paper cut command
 */
export async function testUsbCut(): Promise<{ success: boolean; error?: string }> {
  const p = new EscPosBuilder(48);
  p.line('Test Cut Verification').cutPaper(true);
  return await sendEscPosToUsb(p.build());
}

/**
 * Trigger an immediate test cash drawer kick command
 */
export async function testUsbCashDrawer(): Promise<{ success: boolean; error?: string }> {
  const p = new EscPosBuilder(48);
  p.kickCashDrawer();
  return await sendEscPosToUsb(p.build());
}
