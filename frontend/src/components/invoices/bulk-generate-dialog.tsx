'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { invoicesService } from '@/services/invoices.service';
import { occupanciesService } from '@/services/occupancies.service';
import { getApiErrorMessage } from '@/lib/api';
import { format, addDays } from 'date-fns';

interface Occupancy {
  id: string;
  tenant: {
    firstName: string;
    lastName: string;
  };
  apartment: {
    unitNumber: string;
  };
  monthlyRent: number;
}

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkGenerateDialog({ open, onOpenChange, onSuccess }: BulkGenerateDialogProps) {
  const { toast } = useToast();
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [results, setResults] = useState<{
    generated: number;
    failed: number;
    errors: Array<{ occupancyId: string; reason: string }>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadOccupancies();
      // Set default dates
      const today = new Date();
      const nextWeek = addDays(today, 7);
      setIssueDate(format(today, 'yyyy-MM-dd'));
      setDueDate(format(nextWeek, 'yyyy-MM-dd'));
      setResults(null);
      setSelectedIds([]);
    }
  }, [open]);

  const loadOccupancies = async () => {
    try {
      setLoading(true);
      const response = await occupanciesService.getActive();
      setOccupancies(response.data.data || []);
    } catch (error) {
      console.error('Error loading occupancies:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(occupancies.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOccupancy = (occupancyId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, occupancyId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== occupancyId));
    }
  };

  const calculateTotalAmount = () => {
    return occupancies
      .filter((o) => selectedIds.includes(o.id))
      .reduce((sum, o) => sum + o.monthlyRent, 0);
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one occupancy',
        variant: 'destructive',
      });
      return;
    }

    if (!issueDate || !dueDate) {
      toast({
        title: 'Error',
        description: 'Please set issue and due dates',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      const response = await invoicesService.bulkGenerate({
        occupancyIds: selectedIds,
        issueDate,
        dueDate,
      });

      const { generated, failed } = response.data;

      setResults({
        generated: generated.length,
        failed: failed.length,
        errors: failed,
      });

      if (failed.length === 0) {
        toast({
          title: 'Success',
          description: `Successfully generated ${generated.length} invoices`,
        });

        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 2000);
      } else {
        toast({
          title: 'Partially Complete',
          description: `Generated ${generated.length} invoices. ${failed.length} failed.`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Bulk Generate Rent Invoices</DialogTitle>
          <DialogDescription>
            Generate invoices for multiple active occupancies at once
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-4">
            {/* Results Summary */}
            <div className="p-6 rounded-lg bg-muted space-y-4">
              <div className="flex items-center gap-3">
                {results.failed === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-yellow-500" />
                )}
                <div>
                  <h3 className="text-lg font-semibold">Generation Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    {results.generated} invoices generated successfully
                    {results.failed > 0 && `, ${results.failed} failed`}
                  </p>
                </div>
              </div>

              {/* Error Details */}
              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">Failed Invoices:</h4>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-sm flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                        <span className="text-muted-foreground">{error.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {results.failed === 0 && (
                <Button onClick={() => onSuccess?.()}>
                  View Invoices
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  disabled={generating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={generating}
                />
              </div>
            </div>

            {/* Occupancies Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Occupancies</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedIds.length === occupancies.length && occupancies.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={loading || generating}
                  />
                  <label
                    htmlFor="selectAll"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : occupancies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active occupancies found
                </div>
              ) : (
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {occupancies.map((occupancy) => (
                    <div
                      key={occupancy.id}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={occupancy.id}
                        checked={selectedIds.includes(occupancy.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOccupancy(occupancy.id, checked as boolean)
                        }
                        disabled={generating}
                      />
                      <label
                        htmlFor={occupancy.id}
                        className="flex-1 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-medium">
                            {occupancy.tenant.firstName} {occupancy.tenant.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Unit {occupancy.apartment.unitNumber}
                          </div>
                        </div>
                        <div className="font-semibold">
                          ${occupancy.monthlyRent.toLocaleString()}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {selectedIds.length > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {selectedIds.length} invoice{selectedIds.length !== 1 ? 's' : ''} to generate
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      ${calculateTotalAmount().toLocaleString()}
                    </div>
                  </div>
                  <Button onClick={handleGenerate} disabled={generating}>
                    {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Invoices
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generating}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
