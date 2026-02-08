import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';

interface CrisisSimulatorProps {
  onSimulateCrisis: () => void;
  isSimulating: boolean;
}

export function CrisisSimulator({ onSimulateCrisis, isSimulating }: CrisisSimulatorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (!isSimulating) {
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onSimulateCrisis();
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isSimulating}
        className={`
          px-3 py-1.5 sm:px-4 sm:py-2 rounded text-[10px] sm:text-[11px] font-medium
          flex items-center gap-1.5 sm:gap-2 transition-all shrink-0
          ${isSimulating 
            ? 'bg-red-500/20 text-red-400 cursor-not-allowed border border-red-500/30' 
            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30'
          }
        `}
        style={{
          backgroundColor: isSimulating 
            ? (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)')
            : (isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)'),
          borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)'
        }}
      >
        <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">{isSimulating ? 'Crisis Active...' : 'Simulate Conflict'}</span>
        <span className="sm:hidden">{isSimulating ? 'Active...' : 'Simulate'}</span>
      </button>

      {showConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div 
            className="rounded-lg p-6 max-w-md w-full"
            style={{
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }}
              >
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#1f2937' }}>
                  Simulate Crisis?
                </h3>
                <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  This will trigger a dramatic conflict scenario
                </p>
              </div>
            </div>
            
            <div 
              className="rounded p-3 mb-4"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              <p className="text-xs" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
                • Health Score will drop to 45%<br />
                • Knowledge Graph nodes turn RED<br />
                • Critical alert toast appears<br />
                • Shadow Council auto-activates with fix
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#ffffff' : '#1f2937'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
              >
                Simulate Crisis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

