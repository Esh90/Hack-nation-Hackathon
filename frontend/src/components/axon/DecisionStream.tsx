import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Decision } from '@/lib/synthetic-data';
import { formatDistanceToNow } from 'date-fns';

interface DecisionStreamProps {
  decisions: Decision[];
}

export function DecisionStream({ decisions }: DecisionStreamProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusColors = {
    new: '#10b981',
    updated: '#3b82f6',
    old: '#6b7280'
  };

  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Decision Stream</h2>
          <p className="text-[11px] text-text-muted">Versioned organizational truth</p>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-default">
          All Teams
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {decisions.map((decision, index) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-14"
              >
                {/* Timeline node */}
                <div 
                  className="absolute left-[19px] top-2 w-3 h-3 rounded-full border-2 border-[#0a0a0a] z-10"
                  style={{ 
                    backgroundColor: statusColors[decision.status],
                    boxShadow: decision.status === 'new' 
                      ? `0 0 12px ${statusColors[decision.status]}` 
                      : 'none'
                  }}
                >
                  {decision.status === 'new' && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: statusColors[decision.status] }}
                    />
                  )}
                </div>

                {/* Decision card */}
                <div 
                  className="bg-[#0d0d0d] p-4 cursor-pointer hover:bg-[#121212] transition-all"
                  style={{ background: 'hsl(0 0% 5%)' }}
                  onClick={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] font-mono text-text-tertiary px-2 py-0.5"
                        style={{ background: 'hsl(0 0% 10%)' }}
                      >
                        v{decision.version}
                      </span>
                      <h3 className="text-sm font-medium text-text-primary">
                        {decision.title}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedId === decision.id ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    </motion.div>
                  </div>

                  <div className="text-[11px] text-text-muted mb-2">
                    by {decision.author} • {formatDistanceToNow(decision.timestamp, { addSuffix: true })}
                  </div>

                  <div className="text-[10px] text-success mb-1">
                    ↗ {decision.change}
                  </div>

                  <AnimatePresence>
                    {expandedId === decision.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">
                            Reasoning
                          </div>
                          <div className="text-[11px] text-text-secondary leading-relaxed">
                            {decision.reasoning}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {expandedId !== decision.id && (
                    <div className="text-[10px] text-text-muted mt-2 hover:text-text-tertiary transition-colors">
                      View reasoning →
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
