import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import type { PasswordResetResponse } from '@/types/api'
import type { ReactElement } from 'react'

export type ResetLink = PasswordResetResponse

export interface ResetLinkDialogProps {
  resetLink: ResetLink | null
  onClose: () => void
  onCopy: () => Promise<void>
}

export default function ResetLinkDialog({ resetLink, onClose, onCopy }: ResetLinkDialogProps): ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [onCopy])

  return (
    <Dialog open={!!resetLink} onOpenChange={(open) => { if (!open) { setCopied(false); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Password Reset Link</DialogTitle>
          <DialogDescription>{resetLink?.full_name} · {resetLink?.email}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Reset Link</label>
          <Input
            value={resetLink?.reset_url || ''}
            readOnly
            className="font-mono text-xs"
            aria-label="Password reset link"
          />
          {resetLink?.is_local_url && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-md px-3 py-2">
              ⚠ This link uses localhost and won't work for other users. Run the backend with a production <code className="font-mono">FRONTEND_URL</code> to generate shareable links.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Expires {resetLink && new Date(resetLink.expires_at).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
          <Button onClick={handleCopy}>
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
