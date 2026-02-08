import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lock, CheckCircle, XCircle, X } from "lucide-react";
import {
  adminAuth,
  adminChat,
  adminConfirmGraph,
  type AdminChatResponse,
} from "@/lib/api";

interface AdminChatProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after graph is updated (confirm or command). Can be async; we await it so dashboard refreshes before showing success. */
  onGraphUpdated: () => void | Promise<void>;
}

export function AdminChat({ isOpen, onClose, onGraphUpdated }: AdminChatProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ type: string; content: string; preview?: AdminChatResponse["preview"] }[]>([]);
  const [pendingUpdate, setPendingUpdate] = useState<AdminChatResponse["preview"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleAuth = async () => {
    setAuthError("");
    setIsLoading(true);
    try {
      const data = await adminAuth(password);
      setSessionId(data.session_id);
      setIsAuthenticated(true);
      setChatHistory([
        {
          type: "system",
          content:
            "Welcome, Admin. You have full access to the organization.\n\n• Ask anything: \"What are the current conflicts?\", \"Summarize recent decisions.\"\n• Give updates: \"We're launching X on March 20; Engineering leads.\"\n• Give commands: \"Mark the conflict between Engineering and Marketing as resolved.\"",
        },
      ]);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Invalid password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setChatHistory((prev) => [...prev, { type: "user", content: userMessage }]);
    setMessage("");
    setIsLoading(true);
    setPendingUpdate(null);

    try {
      const data = await adminChat(userMessage, sessionId);

      // Query: show answer only, no confirm
      if (data.is_query && data.answer) {
        setChatHistory((prev) => [
          ...prev,
          { type: "agent", content: data.answer },
        ]);
        return;
      }

      // Command applied (e.g. conflict resolved): refresh dashboard then show message
      if (data.command_applied) {
        const msg = data.message ?? data.detected;
        await onGraphUpdated();
        setChatHistory((prev) => [
          ...prev,
          { type: "system", content: `✓ ${msg} Dashboard updated.` },
        ]);
        return;
      }

      // Update: show preview and Confirm/Cancel
      setChatHistory((prev) => [
        ...prev,
        {
          type: "agent",
          content:
            data.nodes_to_add > 0 || data.edges_to_add > 0
              ? `I detected: ${data.detected}\n\nI'll add ${data.nodes_to_add} nodes and ${data.edges_to_add} connections. Confirm below to update the graph.`
              : data.detected,
          preview: data.preview,
        },
      ]);
      setPendingUpdate(data.preview);
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        {
          type: "error",
          content: e instanceof Error ? e.message : "Sorry, I couldn't process that.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingUpdate?.nodes && !pendingUpdate?.edges) return;
    const nodes = pendingUpdate?.nodes ?? [];
    const edges = pendingUpdate?.edges ?? [];

    setIsLoading(true);
    try {
      const data = await adminConfirmGraph(nodes, edges, sessionId);
      await onGraphUpdated();
      setChatHistory((prev) => [
        ...prev,
        {
          type: "system",
          content: `✓ Knowledge graph updated! Added ${data.nodes_added} nodes and ${data.edges_added} connections. Conflict list, decisions, and health are updated.`,
        },
      ]);
      setPendingUpdate(null);
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        {
          type: "error",
          content: e instanceof Error ? e.message : "Failed to update graph.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingUpdate(null);
    setChatHistory((prev) => [
      ...prev,
      { type: "system", content: "Update cancelled." },
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 h-[min(500px,85vh)] bg-[#0a0a0a] border-t border-[#2a2a2a] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 h-14 border-b border-[#2a2a2a] flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-emerald-500" aria-hidden />
                <span className="text-sm font-medium text-white">
                  Admin: Live Knowledge Builder
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white transition-colors rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-4">
                  <div className="text-center">
                    <Lock className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                    <h3 className="text-base font-medium text-white mb-1">
                      Admin authentication
                    </h3>
                    <p className="text-xs text-gray-500">
                      Enter password to access the live knowledge builder
                    </p>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-white text-sm placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                    disabled={isLoading}
                  />
                  {authError && (
                    <p className="text-xs text-red-400">{authError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleAuth}
                    disabled={isLoading || !password.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
                  >
                    {isLoading ? "Authenticating…" : "Authenticate"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Chat area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-lg text-sm ${
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.type === "system"
                              ? "bg-emerald-900/30 text-emerald-300 border border-emerald-800"
                              : msg.type === "error"
                                ? "bg-red-900/30 text-red-300 border border-red-800"
                                : "bg-[#0f0f0f] text-gray-300 border border-[#2a2a2a]"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.preview?.nodes?.length !== undefined && msg.preview.nodes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                            <div className="text-xs text-gray-400">Preview:</div>
                            <div className="text-xs text-gray-300">
                              Nodes: {msg.preview.nodes.map((n: { label?: string }) => n?.label).filter(Boolean).join(", ") || "—"}
                            </div>
                            <div className="text-xs text-gray-300">
                              Edges: {msg.preview.edges?.length ?? 0} connections
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a]">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm / Cancel */}
                {pendingUpdate && (pendingUpdate.nodes?.length > 0 || pendingUpdate.edges?.length > 0) && (
                  <div className="shrink-0 px-4 py-3 bg-[#0f0f0f] border-t border-[#2a2a2a] flex gap-3">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Confirm & update graph
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      Cancel
                    </button>
                  </div>
                )}

                {/* Input */}
                <div className="shrink-0 p-4 border-t border-[#2a2a2a]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="e.g. We're launching AI Assistant on March 20. Engineering leads; Marketing is concerned about timeline."
                      className="flex-1 px-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-white text-sm placeholder:text-gray-500 focus:border-primary focus:outline-none disabled:opacity-60"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isLoading || !message.trim()}
                      className="px-4 py-3 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                      aria-label="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
