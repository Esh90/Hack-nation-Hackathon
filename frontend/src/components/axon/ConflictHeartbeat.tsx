import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { generateHeartbeatData, calculateHealthScore } from "@/lib/synthetic-data";

interface ConflictHeartbeatProps {
  healthScore?: number;
}

export default function ConflictHeartbeat({ healthScore: propScore }: ConflictHeartbeatProps) {
  const healthScore = propScore ?? calculateHealthScore();
  const heartbeatData = generateHeartbeatData(healthScore);

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const healthColor = getHealthColor(healthScore);

  return (
    <div className="h-full flex flex-col">
      {/* Health Score Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="text-center"
        >
          <div 
            className="text-5xl font-light font-mono mb-1"
            style={{ 
              background: `linear-gradient(135deg, ${healthColor}, ${healthColor}cc)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {healthScore}%
          </div>
          <div className="text-[10px] text-gray-600 tracking-widest">
            ORGANIZATIONAL HEALTH SCORE
          </div>
        </motion.div>

        {/* Heartbeat Visualization */}
        <div className="w-full h-20 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={heartbeatData}>
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  background: '#0f0f0f', 
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
                labelStyle={{ color: '#888' }}
              />
              <Line 
                type="monotone" 
                dataKey="health" 
                stroke={healthColor}
                strokeWidth={2}
                dot={false}
                animationDuration={1500}
                style={{
                  filter: `drop-shadow(0 0 8px ${healthColor}80)`
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pulse indicator */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-2 h-2 rounded-full mt-2"
          style={{ backgroundColor: healthColor }}
        />
      </div>
    </div>
  );
}

