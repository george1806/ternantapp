'use client';

import { CheckCircle2, FileText, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Tenant } from '@/types';

interface TenantSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onCreateLease: () => void;
  onViewTenant: () => void;
}

/**
 * Tenant Success Dialog
 * Shows after successfully creating a tenant with quick actions
 * - Create Lease Agreement (primary action)
 * - View Tenant Details
 * - Done/Close
 */
export function TenantSuccessDialog({
  open,
  onOpenChange,
  tenant,
  onCreateLease,
  onViewTenant,
}: TenantSuccessDialogProps) {
  if (!tenant) return null;

  const handleCreateLease = () => {
    onOpenChange(false);
    onCreateLease();
  };

  const handleViewTenant = () => {
    onOpenChange(false);
    onViewTenant();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-center">Tenant Created Successfully!</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold text-foreground">{tenant.firstName} {tenant.lastName}</span> has been added to your system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleCreateLease}
            className="w-full gap-2"
            size="lg"
          >
            <FileText className="h-4 w-4" />
            Create Lease Agreement
          </Button>

          <Button
            onClick={handleViewTenant}
            variant="outline"
            className="w-full gap-2"
          >
            <Eye className="h-4 w-4" />
            View Tenant Details
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
