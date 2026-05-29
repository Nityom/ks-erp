'use client';
import { Sun, Moon, Download, Upload, FlaskConical, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { exportAllData, importAllData, clearAllData, isDemoDataActive } from '@/lib/storage';
import { downloadJSON } from '@/lib/utils';
import { useRef, useState } from 'react';

interface HeaderProps {
  title: string;
  mobileMenuButton?: React.ReactNode;
}

export default function Header({ title, mobileMenuButton }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoActive, setDemoActive] = useState(() => isDemoDataActive());

  const handleDemoToggle = async () => {
    if (demoActive) {
      if (!confirm('This will remove all demo data and clear everything. Continue?')) return;
      clearAllData();
      window.location.reload();
    } else {
      if (!confirm('This will replace ALL existing data with demo data. Continue?')) return;
      setLoadingDemo(true);
      const { seedDummyData } = await import('@/lib/dummyData');
      seedDummyData();
      localStorage.setItem('pcp_demo_active', '1');
      window.location.reload();
    }
  };

  const handleExport = () => {
    const data = exportAllData();
    downloadJSON({ exportDate: new Date().toISOString(), ...data }, `ks-erp-backup-${Date.now()}.json`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        importAllData(data);
        window.location.reload();
      } catch {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {mobileMenuButton}
      <h1 className="text-base font-semibold flex-1 truncate" style={{ color: 'var(--text)' }}>
        {title}
      </h1>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDemoToggle}
          disabled={loadingDemo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80 disabled:opacity-50"
          style={demoActive
            ? { borderColor: 'var(--red)', color: 'var(--red)', background: 'rgba(239,68,68,0.08)' }
            : { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }
          }
          title={demoActive ? 'Remove demo data' : 'Load demo data to preview all modules'}
        >
          {demoActive ? <Trash2 size={13} /> : <FlaskConical size={13} />}
          {loadingDemo ? 'Loading…' : demoActive ? 'Clear Demo' : 'Demo Data'}
        </button>
        <button
          onClick={handleExport}
          className="p-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Export backup"
          style={{ color: 'var(--text-muted)' }}
        >
          <Download size={16} />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Import backup"
          style={{ color: 'var(--text-muted)' }}
        >
          <Upload size={16} />
        </button>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
    </header>
  );
}
