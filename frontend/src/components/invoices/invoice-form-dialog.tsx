'use client';

import { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { invoicesService } from '@/services/invoices.service';
import { occupanciesService } from '@/services/occupancies.service';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Occupancy } from '@/types';
import { Loader2, Trash2, Plus } from 'lucide-react';

/**
 * Invoice Form Dialog Component
 *
 * Features:
 * - Create new invoices against occupancies
 * - Dynamic line items management (add/remove rows)
 * - Auto-calculate subtotal and total
 * - Load active occupancies from backend
 * - Tax support
 * - Real-time calculations
 * - Comprehensive form validation with Zod
 */

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0.01, 'Unit price must be greater than 0'),
  itemType: z.enum(['rent', 'utility', 'maintenance', 'other']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
});

const invoiceFormSchema = z.object({
  occupancyId: z.string().min(1, 'Please select an occupancy'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: InvoiceFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingOccupancies, setLoadingOccupancies] = useState(false);
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [selectedOccupancy, setSelectedOccupancy] = useState<Occupancy | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();
  const currency = user?.company?.currency || 'KES';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      occupancyId: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      items: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          itemType: 'rent',
          amount: 0,
        },
      ],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const occupancyId = watch('occupancyId');
  const items = watch('items');

  // Load active occupancies when dialog opens
  useEffect(() => {
    if (open) {
      loadOccupancies();
    }
  }, [open]);

  // Update selected occupancy and pre-fill first item with monthly rent
  useEffect(() => {
    if (occupancyId) {
      const occupancy = occupancies.find((occ) => occ.id === occupancyId);
      setSelectedOccupancy(occupancy || null);

      if (occupancy && occupancy.monthlyRent > 0) {
        setValue('items.0.description', `Monthly Rent - ${occupancy.apartment?.unitNumber || 'Unit'}`);
        setValue('items.0.quantity', 1);
        setValue('items.0.unitPrice', occupancy.monthlyRent);
        setValue('items.0.amount', occupancy.monthlyRent);
      }
    }
  }, [occupancyId, occupancies, setValue]);

  const loadOccupancies = async () => {
    try {
      setLoadingOccupancies(true);
      const response = await occupanciesService.getActive({
        limit: 100,
        page: 1,
      });

      if (response.data?.data) {
        setOccupancies(response.data.data);

        if (response.data.data.length === 0) {
          toast({
            title: 'Info',
            description: 'No active occupancies available',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load occupancies:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoadingOccupancies(false);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const subtotal = calculateSubtotal();

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitting(true);

      // Transform line items to match backend format
      const transformedItems = data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemType: item.itemType as 'rent' | 'utility' | 'maintenance' | 'other',
      }));

      await invoicesService.create({
        occupancyId: data.occupancyId,
        invoiceDate: new Date(data.invoiceDate).toISOString().split('T')[0],
        dueDate: new Date(data.dueDate).toISOString().split('T')[0],
        items: transformedItems,
        notes: data.notes,
      });

      toast({
        title: 'Success',
        description: 'Invoice created successfully!',
      });

      reset();
      setSelectedOccupancy(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast({
        title: 'Error',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for an occupancy
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Occupancy Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occupancyId">Occupancy *</Label>
              <select
                {...register('occupancyId')}
                id="occupancyId"
                disabled={loadingOccupancies || submitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loadingOccupancies ? 'Loading...' : 'Select occupancy'}
                </option>
                {occupancies.map((occ) => (
                  <option key={occ.id} value={occ.id}>
                    {occ.apartment?.unitNumber} - {occ.tenant?.firstName} {occ.tenant?.lastName}
                  </option>
                ))}
              </select>
              {errors.occupancyId && (
                <span className="text-sm text-destructive">{errors.occupancyId.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                {...register('invoiceDate')}
                id="invoiceDate"
                type="date"
                disabled={submitting}
              />
              {errors.invoiceDate && (
                <span className="text-sm text-destructive">{errors.invoiceDate.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                {...register('dueDate')}
                id="dueDate"
                type="date"
                disabled={submitting}
              />
              {errors.dueDate && (
                <span className="text-sm text-destructive">{errors.dueDate.message}</span>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label>Line Items *</Label>
            <div className="border rounded-lg p-4 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {/* Description */}
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor={`items.${index}.description`} className="text-xs">
                        Description
                      </Label>
                      <Input
                        {...register(`items.${index}.description`)}
                        id={`items.${index}.description`}
                        placeholder="e.g., Monthly Rent"
                        disabled={submitting}
                        className="h-8 text-sm"
                      />
                      {errors.items?.[index]?.description && (
                        <span className="text-xs text-destructive">
                          {errors.items[index]?.description?.message}
                        </span>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label htmlFor={`items.${index}.quantity`} className="text-xs">
                        Qty
                      </Label>
                      <Input
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        id={`items.${index}.quantity`}
                        type="number"
                        step="0.01"
                        disabled={submitting}
                        className="h-8 text-sm"
                      />
                      {errors.items?.[index]?.quantity && (
                        <span className="text-xs text-destructive">
                          {errors.items[index]?.quantity?.message}
                        </span>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="space-y-1">
                      <Label htmlFor={`items.${index}.unitPrice`} className="text-xs">
                        Price
                      </Label>
                      <Input
                        {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                        id={`items.${index}.unitPrice`}
                        type="number"
                        step="0.01"
                        disabled={submitting}
                        className="h-8 text-sm"
                      />
                      {errors.items?.[index]?.unitPrice && (
                        <span className="text-xs text-destructive">
                          {errors.items[index]?.unitPrice?.message}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <Label htmlFor={`items.${index}.amount`} className="text-xs">
                        Amount
                      </Label>
                      <Input
                        {...register(`items.${index}.amount`, { valueAsNumber: true })}
                        id={`items.${index}.amount`}
                        type="number"
                        step="0.01"
                        disabled={submitting}
                        className="h-8 text-sm"
                        value={
                          items[index]?.quantity && items[index]?.unitPrice
                            ? (items[index].quantity * items[index].unitPrice).toFixed(2)
                            : items[index]?.amount?.toFixed(2) || ''
                        }
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Type and Delete */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
                    <div className="space-y-1 md:col-span-3">
                      <Label htmlFor={`items.${index}.itemType`} className="text-xs">
                        Type
                      </Label>
                      <select
                        {...register(`items.${index}.itemType`)}
                        id={`items.${index}.itemType`}
                        disabled={submitting}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="rent">Rent</option>
                        <option value="utility">Utility</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 flex items-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={submitting}
                          className="w-full h-8"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Item Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: '',
                    quantity: 1,
                    unitPrice: 0,
                    itemType: 'other',
                    amount: 0,
                  })
                }
                disabled={submitting}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>
            {errors.items && (
              <span className="text-sm text-destructive">{errors.items.message}</span>
            )}
          </div>

          {/* Totals */}
          <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
            <div className="border-t border-muted pt-2 flex justify-between font-medium">
              <span>Total:</span>
              <span className="text-lg">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              {...register('notes')}
              id="notes"
              placeholder="Additional invoice details..."
              disabled={submitting}
              rows={2}
            />
            {errors.notes && (
              <span className="text-sm text-destructive">{errors.notes.message}</span>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingOccupancies}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
