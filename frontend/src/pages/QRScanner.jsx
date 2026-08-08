import { useEffect, useRef, useState } from 'react';
import { QrCode, CheckCircle, Package, Calendar, Hash, MapPin } from 'lucide-react';
import { PageHeader, Alert } from '../components/ui';
import api from '../api';

export default function QRScanner() {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const startScanner = async () => {
    setError('');
    setResult(null);
    setConfirmed(false);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await lookupBatch(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setError('Camera not available. Use manual input below.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }
    setScanning(false);
  };

  const lookupBatch = async (data) => {
    setError('');
    try {
      const res = await api.post('/inventory/scan-qr', { qr_data: data });
      setResult(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Batch not found');
    }
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await lookupBatch(manualInput.trim());
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => { setResult(null); setConfirmed(false); setManualInput(''); }, 3000);
  };

  useEffect(() => () => stopScanner(), []);

  return (
    <div>
      <PageHeader title="QR Code Scanner" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scanner */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <QrCode size={18} className="text-blue-600" /> Camera Scanner
          </h3>

          {/* QR Reader container */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden mb-4" style={{ minHeight: 280 }}>
            <div id="qr-reader" className="w-full" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <QrCode size={64} className="opacity-20 mb-4" />
                <p className="text-sm">Camera preview will appear here</p>
              </div>
            )}
            {/* Scan overlay */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-blue-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-400 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mb-4">
            {!scanning ? (
              <button className="btn btn-primary flex-1" onClick={startScanner}>
                <QrCode size={16} /> Start Scanning
              </button>
            ) : (
              <button className="btn btn-danger flex-1" onClick={stopScanner}>
                Stop Scanner
              </button>
            )}
          </div>

          {/* Manual input */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 mb-2">Or enter batch ID manually:</p>
            <form onSubmit={handleManual} className="flex gap-2">
              <input className="input flex-1" placeholder='{"id":"batch-uuid"} or batch ID'
                value={manualInput} onChange={e => setManualInput(e.target.value)} />
              <button type="submit" className="btn btn-outline">Lookup</button>
            </form>
          </div>

          {error && <Alert type="error">{error}</Alert>}
        </div>

        {/* Result */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-green-600" /> Medicine Details
          </h3>

          {confirmed && (
            <div className="flex flex-col items-center justify-center py-12 text-green-600">
              <CheckCircle size={56} className="mb-3" />
              <p className="font-semibold text-lg">Delivery Confirmed!</p>
              <p className="text-sm text-slate-500 mt-1">Stock has been updated</p>
            </div>
          )}

          {!confirmed && !result && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <QrCode size={56} className="mb-3" />
              <p className="text-sm text-slate-400">Scan a QR code to see medicine details</p>
            </div>
          )}

          {!confirmed && result && (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-green-700 font-medium text-sm">Batch verified successfully</span>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Package,  label: 'Medicine',    value: result.medicine_name },
                  { icon: Hash,     label: 'Batch Number',value: result.batch_number },
                  { icon: Hash,     label: 'Lot Number',  value: result.lot_number || '—' },
                  { icon: Calendar, label: 'Expiry Date', value: result.expiry_date ? new Date(result.expiry_date).toLocaleDateString() : '—' },
                  { icon: Package,  label: 'Quantity',    value: `${result.remaining_quantity} ${result.unit}` },
                  { icon: MapPin,   label: 'Facility',    value: result.facility_name },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-slate-100">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className="text-sm font-medium text-slate-800">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                <span className={`badge ${result.status === 'ACTIVE' ? 'badge-green' : result.status === 'EXPIRED' ? 'badge-red' : 'badge-gray'}`}>
                  {result.status}
                </span>
              </div>

              <button className="btn btn-success w-full justify-center mt-6" onClick={handleConfirm}>
                <CheckCircle size={16} /> Confirm Receipt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
