'use client';

/**
 * Reusable Delete Confirmation Dialog Component
 *
 * A generic, reusable confirmation dialog for delete operations
 * Provides a consistent UX for confirming destructive actions
 *
 * Features:
 * - Customizable title and description
 * - Warning indicator
 * - Loading state during deletion
 * - Keyboard accessible
 * - Material design with destructive styling
 *
 * @author george1806
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;

  /**
   * Callback to change dialog open state
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Async callback to execute on confirmation
   * Should handle the actual deletion logic
   */
  onConfirm: () => Promise<void>;

  /**
   * Dialog title
   * @default "Delete Item"
   */
  title?: string;

  /**
   * Dialog description/warning message
   * @default "Are you sure you want to delete this item? This action cannot be undone."
   */
  description?: string;

  /**
   * Name of the item being deleted (optional)
   * Will be highlighted in red if provided
   */
  itemName?: string;

  /**
   * Confirm button text
   * @default "Delete"
   */
  confirmText?: string;

  /**
   * Cancel button text
   * @default "Cancel"
   */
  cancelText?: string;

  /**
   * Additional warning message to display
   */
  warningMessage?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  warningMessage,
}: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
      // Dialog will be closed by the parent component after successful deletion
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Delete operation failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (!deleting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Name Highlight */}
          {itemName && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground mb-1">Item to be deleted:</p>
              <p className="font-semibold text-destructive">{itemName}</p>
            </div>
          )}

          {/* Additional Warning Message */}
          {warningMessage && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> {warningMessage}
              </p>
            </div>
          )}

          {/* Default Warning if no custom warning */}
          {!warningMessage && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">
                This action is permanent and cannot be undone.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={deleting}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
            className="min-w-[100px]"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
