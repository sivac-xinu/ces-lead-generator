import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAIConfigStore } from '@/store/aiConfigStore'
import { Eye, EyeOff } from 'lucide-react'

interface AISettingsModalProps {
  open: boolean
  onClose: () => void
}

const PROVIDER_CONFIGS = [
  {
    key: 'openrouterKey' as const,
    label: 'OpenRouter API Key',
    help: 'Get a free key at openrouter.ai/keys. Used for gemma/llama models.',
  },
  {
    key: 'openaiKey' as const,
    label: 'OpenAI API Key',
    help: 'Get a key at platform.openai.com/api-keys. Used for GPT-4o models.',
  },
  {
    key: 'anthropicKey' as const,
    label: 'Anthropic API Key',
    help: 'Get a key at console.anthropic.com. Used for Claude models.',
  },
]

export function AISettingsModal({ open, onClose }: AISettingsModalProps) {
  const { openrouterKey, openaiKey, anthropicKey, setKey } = useAIConfigStore()
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [values, setValues] = useState({
    openrouterKey,
    openaiKey,
    anthropicKey,
  })

  const handleSave = () => {
    Object.entries(values).forEach(([provider, key]) => {
      setKey(provider as keyof typeof values, key.trim())
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Engine Settings"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Keys
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-ces-muted">
          Enter your own API keys for AI-powered lead intelligence. Keys are stored locally in
          your browser and sent securely through the CES Supabase Edge Function. Leave a key blank
          to use the server-side configured key (if available) or mock mode.
        </p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Edge Function required</p>
          <p className="mt-1">
            Adding a key does not deploy the proxy. You must also deploy <code>ai-proxy</code> to
            Supabase:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-2 text-xs">
{`npx supabase login
npx supabase functions deploy ai-proxy`}
          </pre>
        </div>

        {PROVIDER_CONFIGS.map((cfg) => (
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
      </div>
    </Modal>
  )
}
