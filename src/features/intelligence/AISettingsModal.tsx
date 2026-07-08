import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAISettings, useUpdateAISettings, type AIProviderKeys } from '@/hooks/useAISettings'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

interface AISettingsModalProps {
  open: boolean
  onClose: () => void
}

const PROVIDER_CONFIGS = [
  {
    key: 'openrouter_key' as const,
    label: 'OpenRouter API Key',
    help: 'Get a key at openrouter.ai/keys. Used for gemma/llama models.',
  },
  {
    key: 'openai_key' as const,
    label: 'OpenAI API Key',
    help: 'Get a key at platform.openai.com/api-keys. Used for GPT-4o models.',
  },
  {
    key: 'anthropic_key' as const,
    label: 'Anthropic API Key',
    help: 'Get a key at console.anthropic.com. Used for Claude models.',
  },
  {
    key: 'gemini_key' as const,
    label: 'Google Gemini API Key',
    help: 'Get a key at aistudio.google.com/app/apikey. Used for Gemini models.',
  },
]

export function AISettingsModal({ open, onClose }: AISettingsModalProps) {
  const { isAdmin } = useAuth()
  const { data: savedKeys, isLoading } = useAISettings()
  const updateSettings = useUpdateAISettings()

  const [show, setShow] = useState<Record<string, boolean>>({})
  const [values, setValues] = useState<Required<AIProviderKeys>>(() => ({
    openrouter_key: savedKeys?.openrouter_key ?? '',
    openai_key: savedKeys?.openai_key ?? '',
    anthropic_key: savedKeys?.anthropic_key ?? '',
    gemini_key: savedKeys?.gemini_key ?? '',
  }))

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      openrouter_key: values.openrouter_key.trim() || undefined,
      openai_key: values.openai_key.trim() || undefined,
      anthropic_key: values.anthropic_key.trim() || undefined,
      gemini_key: values.gemini_key.trim() || undefined,
    })
    onClose()
  }

  if (!isAdmin) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="AI Engine Settings"
        size="md"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Only administrators can configure AI provider keys. Contact your admin if you need a
            cloud AI provider enabled.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Engine Settings (Admin)"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={updateSettings.isPending}>
            Save Keys
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-ces-muted">
          These keys are shared across the whole team. They are stored in the Supabase database and
          used by the <code>ai-proxy</code> Edge Function. Non-admin users will use these keys
          automatically.
        </p>

        {isLoading && (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ces-orange border-t-transparent" />
          </div>
        )}

        {!isLoading &&
          PROVIDER_CONFIGS.map((cfg) => (
            <div key={cfg.key}>
              <label className="label flex items-center justify-between">
                {cfg.label}
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [cfg.key]: !s[cfg.key] }))}
                  className="text-ces-muted hover:text-ces-text"
                >
                  {show[cfg.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </label>
              <Input
                type={show[cfg.key] ? 'text' : 'password'}
                value={values[cfg.key]}
                onChange={(e) => setValues((v) => ({ ...v, [cfg.key]: e.target.value }))}
                placeholder={`Paste ${cfg.label} here`}
              />
              <p className="mt-1 text-xs text-ces-muted">{cfg.help}</p>
            </div>
          ))}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-ces-muted">
          <p className="font-medium text-ces-text">Deployment note</p>
          <p className="mt-1">
            If you prefer, you can also set keys as Supabase Edge Function secrets (more secure):
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-white p-2">
{`npx supabase secrets set OPENROUTER_API_KEY=...
npx supabase secrets set OPENAI_API_KEY=...
npx supabase secrets set ANTHROPIC_API_KEY=...
npx supabase secrets set GEMINI_API_KEY=...`}
          </pre>
        </div>
      </div>
    </Modal>
  )
}
