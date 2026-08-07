import Copy from 'lucide-react/dist/esm/icons/copy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

export default function ResetLinkDialog({ resetLink, onClose, onCopy }) {
  return (
    <Dialog open={!!resetLink} onOpenChange={(open) => !open && onClose()}>
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
          <Button onClick={onCopy}>
            <Copy size={15} /> Copy Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
