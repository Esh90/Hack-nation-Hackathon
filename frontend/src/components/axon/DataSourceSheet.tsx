import { useState, useEffect } from "react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDataSource,
  uploadDataCsv,
  setDataSourceUrl,
  resetToDefaultData,
  playAudioSfx,
} from "@/lib/api";
import type { DataSourceInfo } from "@/lib/api";

interface DataSourceSheetProps {
  onDataUpdated?: () => void;
}

export function DataSourceSheet({ onDataUpdated }: DataSourceSheetProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<DataSourceInfo | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      getDataSource()
        .then(setSource)
        .catch(() => setSource({ source: "synthetic", url: null }));
    }
  }, [open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setUploading(true);
    try {
      const result = await uploadDataCsv(file);
      setSource({ source: "csv", url: null });
      setMessage({
        type: "success",
        text: `Loaded ${result.nodes} nodes, ${result.edges} edges, ${result.decisions} decisions, ${result.conflicts} conflicts.`,
      });
      onDataUpdated?.();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleLoadUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setMessage(null);
    setLoadingUrl(true);
    try {
      const result = await setDataSourceUrl(url);
      setSource({ source: "url", url });
      setMessage({
        type: "success",
        text: `Loaded from URL: ${result.nodes} nodes, ${result.edges} edges.`,
      });
      onDataUpdated?.();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load URL" });
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleResetToDefault = async () => {
    setMessage(null);
    setResetting(true);
    try {
      const result = await resetToDefaultData();
      setSource({ source: "synthetic", url: null });
      setMessage({
        type: "success",
        text: `Reset to default data: ${result.nodes} nodes, ${result.edges} edges, ${result.conflicts} conflicts.`,
      });
      onDataUpdated?.();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to reset" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          onClick={() => {
            playAudioSfx("click");
          }}
          className="text-[11px] text-text-tertiary hover:text-primary transition-default px-2 py-1 border border-border hover:border-primary/50 rounded"
        >
          Data source
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">Data source</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Current source */}
          <div>
            <Label className="text-[11px] text-text-muted">Current source</Label>
            <p className="mt-1 text-sm text-foreground capitalize">
              {source?.source ?? "—"}
              {source?.url && (
                <span className="block text-[11px] text-text-muted truncate mt-0.5">{source.url}</span>
              )}
            </p>
          </div>

          {/* Reset to default / mock data */}
          <div>
            <Label className="text-[11px] text-text-muted">Default data</Label>
            <p className="text-[11px] text-text-tertiary mt-0.5 mb-2">
              Restore the project’s built-in mock/synthetic data (same as on load). Use this after loading a URL or CSV to go back without refreshing.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              disabled={resetting || source?.source === "synthetic"}
              className="w-full text-[11px]"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Resetting…
                </>
              ) : (
                "Reset to default (mock) data"
              )}
            </Button>
          </div>

          {/* Upload CSV */}
          <div>
            <Label className="text-[11px] text-text-muted">Upload CSV</Label>
            <p className="text-[11px] text-text-tertiary mt-0.5 mb-2">
              Any CSV: use <code className="px-1 bg-muted rounded">record_type</code> for full control, or <code className="px-1 bg-muted rounded">source</code>+<code className="px-1 bg-muted rounded">target</code> (edge list), or <code className="px-1 bg-muted rounded">id</code>+<code className="px-1 bg-muted rounded">label</code> (node list). Graph and dashboard update automatically.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="text-[11px] h-9"
              />
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Load from URL (admin API) */}
          <div>
            <Label className="text-[11px] text-text-muted">Admin page / API URL</Label>
            <p className="text-[11px] text-text-tertiary mt-0.5 mb-2">
              Any URL: JSON APIs (nodes/edges) or <strong>any website</strong> (e.g. https://nstp.pk) — we scrape the page and build a graph from its title and links. Dashboard updates automatically.
            </p>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://nstp.pk or http://localhost:8000/api/data/export"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
                disabled={loadingUrl}
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleLoadUrl}
                disabled={loadingUrl || !urlInput.trim()}
              >
                {loadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded border text-sm ${
                message.type === "success"
                  ? "border-success/50 bg-success/10 text-success"
                  : "border-error/50 bg-error/10 text-error"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
