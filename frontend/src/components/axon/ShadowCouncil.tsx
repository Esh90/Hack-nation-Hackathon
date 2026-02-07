import { useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: 'optimist' | 'chief' | 'skeptic';
  message: string;
  isTyping?: boolean;
}

const agents: Agent[] = [
  {
    id: '1',
    name: 'Optimist',
    role: 'optimist',
    message: '3 new decisions detected. 2 align with current roadmap priorities. Recommend proceeding with implementation.',
  },
  {
    id: '2',
    name: 'Chief of Staff',
    role: 'chief',
    message: 'Synthesizing perspectives...',
    isTyping: true,
  },
  {
    id: '3',
    name: 'Skeptic',
    role: 'skeptic',
    message: 'However, dependency risk detected in Engineering timeline. Marketing deadline may conflict with Q1 sprint capacity.',
  },
];

const roleColors = {
  optimist: {
    dot: 'bg-success',
    avatar: 'bg-success/20 text-success',
    bubble: 'bg-[#0f1f0f] border-[#1a3a1a]',
  },
  chief: {
    dot: 'bg-info',
    avatar: 'bg-info/20 text-info',
    bubble: 'bg-secondary border-border',
  },
  skeptic: {
    dot: 'bg-warning',
    avatar: 'bg-warning/20 text-warning',
    bubble: 'bg-[#1f1709] border-[#3a2a0a]',
  },
};

export function ShadowCouncil() {
  const [isActive, setIsActive] = useState(false);

  return (
    <>
      {/* Bottom Bar - Fixed */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-20 z-40 border-t border-border flex flex-col items-center justify-center backdrop-blur-panel"
        style={{
          background: 'linear-gradient(180deg, transparent, hsl(0 0% 4%) 20%)',
        }}
      >
        {/* Voice Button */}
        <button
          onClick={() => setIsActive(!isActive)}
          className={`w-[280px] h-12 flex items-center justify-center gap-2 border transition-default
            ${isActive 
              ? 'border-success/50 bg-success/10 glow-success' 
              : 'border-border-subtle bg-gradient-to-b from-secondary to-background hover:border-text-hint'
            }`}
        >
          {isActive ? (
            <MicOff className="w-4 h-4 text-success" />
          ) : (
            <Mic className="w-4 h-4 text-text-tertiary" />
          )}
          <span className="text-sm text-text-secondary">
            {isActive ? 'Listening...' : 'Ask Chief of Staff'}
          </span>
        </button>

        {/* Helper Text */}
        <span className="text-[11px] text-text-muted italic mt-2">
          {isActive ? 'Shadow Council activated' : 'Press to activate Shadow Council'}
        </span>
      </div>

      {/* Overlay Panel */}
      {isActive && (
        <div 
          className="fixed bottom-20 left-0 right-0 h-[320px] border-t border-border-subtle backdrop-blur-strong z-50"
          style={{ background: 'hsla(0, 0%, 4%, 0.95)' }}
        >
          <div className="h-full grid grid-cols-3 gap-px bg-border">
            {agents.map((agent) => {
              const colors = roleColors[agent.role];
              return (
                <div key={agent.id} className="bg-background p-4 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="text-xs font-medium text-text-secondary">
                      {agent.name}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-4 ${colors.avatar}`}>
                    {agent.name.charAt(0)}
                  </div>

                  {/* Speech Bubble */}
                  <div className={`flex-1 p-3 border ${colors.bubble}`}>
                    {agent.isTyping ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-text-tertiary">{agent.message}</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {agent.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
