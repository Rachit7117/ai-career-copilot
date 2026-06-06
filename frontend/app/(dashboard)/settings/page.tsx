"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type ApiKey } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";
import { Key, Plus, Trash2, TestTube, CheckCircle2, XCircle, Loader2, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { id: "claude", label: "Anthropic Claude", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { id: "gemini", label: "Google Gemini", models: ["gemini/gemini-1.5-pro", "gemini/gemini-1.5-flash"] },
  { id: "deepseek", label: "DeepSeek", models: ["deepseek/deepseek-chat"] },
  { id: "kimi", label: "Kimi (Moonshot)", models: ["openrouter/moonshot-v1-8k"] },
  { id: "openrouter", label: "OpenRouter", models: [] },
  { id: "groq", label: "Groq", models: ["groq/llama-3.3-70b-versatile", "groq/llama-3.1-8b-instant"] },
] as const;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: keys = [] } = useQuery({ queryKey: ["api-keys"], queryFn: settingsApi.listApiKeys });
  const [showForm, setShowForm] = useState(false);
  const [formProvider, setFormProvider] = useState("openai");
  const [formKey, setFormKey] = useState("");
  const [formModel, setFormModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: () => settingsApi.addApiKey(formProvider, formKey, formModel || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-keys"] }); toast.success("API key saved"); setShowForm(false); setFormKey(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteApiKey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-keys"] }); toast.success("Key deleted"); },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => settingsApi.updateApiKey(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  async function testKey(id: string) {
    setTestingId(id);
    try {
      const result = await settingsApi.testApiKey(id);
      if (result.status === "success") toast.success("Connection successful!");
      else toast.error(`Failed: ${result.error}`);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    } catch {
      toast.error("Test failed");
    } finally {
      setTestingId(null);
    }
  }

  const selectedProvider = PROVIDERS.find((p) => p.id === formProvider);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your API keys and preferences</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />Add API Key
        </button>
      </div>

      {/* Default model info */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Default AI Model</p>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          Using Groq (llama-3.3-70b-versatile) by default via system API key. Connect your own key to use a different model.
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-medium">Add API Key</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Provider</label>
              <select
                value={formProvider}
                onChange={(e) => { setFormProvider(e.target.value); setFormModel(""); }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {selectedProvider && selectedProvider.models.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Default Model <span className="text-muted-foreground font-normal">(optional)</span></label>
                <select value={formModel} onChange={(e) => setFormModel(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Use provider default</option>
                  {selectedProvider.models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !formKey}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Key
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="space-y-3">
        <h2 className="font-medium text-sm">Connected Keys ({keys.length})</h2>
        {keys.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Key className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No API keys connected yet</p>
          </div>
        ) : (
          keys.map((key) => <ApiKeyCard key={key.id} apiKey={key} onTest={testKey} onDelete={(id) => deleteMutation.mutate(id)} onToggle={(id, active) => toggleMutation.mutate({ id, is_active: active })} testingId={testingId} />)
        )}
      </div>
    </div>
  );
}

function ApiKeyCard({ apiKey, onTest, onDelete, onToggle, testingId }: {
  apiKey: ApiKey; onTest: (id: string) => void; onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void; testingId: string | null;
}) {
  const provider = PROVIDERS.find((p) => p.id === apiKey.provider);
  const isTesting = testingId === apiKey.id;

  return (
    <div className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-colors ${apiKey.is_active ? "border-border" : "border-border opacity-60"}`}>
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Key className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{provider?.label || apiKey.provider}</span>
          {apiKey.test_status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
          {apiKey.test_status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-500" />}
        </div>
        <p className="text-xs text-muted-foreground font-mono">••••••••{apiKey.key_hint}</p>
        {apiKey.model_override && <p className="text-xs text-muted-foreground">{apiKey.model_override}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggle(apiKey.id, !apiKey.is_active)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={apiKey.is_active ? "Disable" : "Enable"}
        >
          {apiKey.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onTest(apiKey.id)}
          disabled={isTesting}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Test connection"
        >
          {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { if (confirm("Delete this key?")) onDelete(apiKey.id); }}
          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
