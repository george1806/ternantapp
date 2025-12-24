'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, DollarSign, Users, Calendar, Edit, Building2 } from 'lucide-react';
import { compoundsService, type UpdateCompoundDto } from '@/services/compounds.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/api';
import { format } from 'date-fns';
import type { Compound } from '@/types';

/**
 * Property Detail Page
 *
 * Displays detailed information about a single property compound
 */

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [compound, setCompound] = useState<Compound | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    addressLine: '',
    city: '',
    region: '',
    country: '',
    geoLat: '',
    geoLng: '',
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    if (params.id) {
      loadProperty(params.id as string);
    }
  }, [params.id]);

  const loadProperty = async (id: string) => {
    try {
      setLoading(true);
      const response = await compoundsService.getById(id);
      // Backend returns compound directly, not wrapped in { data: compound }
      const compoundData = response.data as any;
      setCompound(compoundData);

      // Pre-populate edit form with current values
      setEditForm({
        name: compoundData.name || '',
        addressLine: compoundData.addressLine || compoundData.address || '',
        city: compoundData.city || '',
        region: compoundData.region || '',
        country: compoundData.country || '',
        geoLat: compoundData.geoLat?.toString() || '',
        geoLng: compoundData.geoLng?.toString() || '',
        notes: compoundData.notes || compoundData.description || '',
        isActive: compoundData.isActive !== undefined ? compoundData.isActive : true,
      });
    } catch (error) {
      console.error('Failed to load compound:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = () => {
    if (compound) {
      // Refresh form with latest compound data
      setEditForm({
        name: compound.name || '',
        addressLine: compound.addressLine || compound.address || '',
        city: compound.city || '',
        region: compound.region || '',
        country: compound.country || '',
        geoLat: compound.geoLat?.toString() || '',
        geoLng: compound.geoLng?.toString() || '',
        notes: compound.notes || compound.description || '',
        isActive: compound.isActive !== undefined ? compound.isActive : true,
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!compound) return;

    try {
      setSaving(true);

      // Build update DTO - only include fields that have values
      const updateDto: UpdateCompoundDto = {
        name: editForm.name || undefined,
        addressLine: editForm.addressLine || undefined,
        city: editForm.city || undefined,
        region: editForm.region || undefined,
        country: editForm.country || undefined,
        notes: editForm.notes || undefined,
        isActive: editForm.isActive,
      };

      // Handle coordinates - only include if valid numbers
      if (editForm.geoLat && !isNaN(parseFloat(editForm.geoLat))) {
        updateDto.geoLat = parseFloat(editForm.geoLat);
      }
      if (editForm.geoLng && !isNaN(parseFloat(editForm.geoLng))) {
        updateDto.geoLng = parseFloat(editForm.geoLng);
      }

      await compoundsService.update(compound.id, updateDto);

      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });

      // Reload property data
      await loadProperty(compound.id);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update compound:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getApiErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!compound) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Property not found</p>
        <Button onClick={() => router.push('/properties')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
      </div>
    );
  }

  const totalUnits = compound.totalUnits || 0;
  const vacantUnits = compound.vacantUnits || 0;
  const occupiedUnits = totalUnits - vacantUnits;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/properties')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2 truncate">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
              <span className="truncate">{compound.name || 'N/A'}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-1 mt-1 truncate">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{compound.city}, {compound.region || compound.country}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Badge variant={compound.isActive ? 'default' : 'secondary'}>
            {compound.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button className="hidden sm:flex" onClick={handleOpenEditDialog}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Property
          </Button>
          <Button size="icon" className="sm:hidden" onClick={handleOpenEditDialog}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Apartments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{occupiedUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Units rented</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacant</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{vacantUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Available units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Of total units</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property Name</p>
              <p className="text-base">{compound.name || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Address</p>
              <p className="text-base">
                {compound.addressLine || compound.address || 'N/A'}<br />
                {compound.city}, {compound.region && `${compound.region}, `}{compound.country}
                {compound.postalCode && <><br />{compound.postalCode}</>}
              </p>
            </div>

            {(compound.geoLat && compound.geoLng) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Coordinates</p>
                <p className="text-base text-sm">
                  {typeof compound.geoLat === 'number' ? compound.geoLat.toFixed(6) : compound.geoLat}, {typeof compound.geoLng === 'number' ? compound.geoLng.toFixed(6) : compound.geoLng}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={compound.isActive ? 'default' : 'secondary'}>
                {compound.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-base">{compound.createdAt ? format(new Date(compound.createdAt), 'PPP') : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {compound.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{compound.notes}</p>
            </CardContent>
          </Card>
        )}

        {compound.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{compound.description}</p>
            </CardContent>
          </Card>
        )}

        {compound.amenities && compound.amenities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {compound.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-secondary text-sm"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Property Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property information. All fields show current values.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Property Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Property Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Sunset Gardens"
                required
              />
            </div>

            {/* Address Line */}
            <div className="grid gap-2">
              <Label htmlFor="edit-address">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-address"
                value={editForm.addressLine}
                onChange={(e) => setEditForm({ ...editForm, addressLine: e.target.value })}
                placeholder="e.g., 123 Main Street"
                required
              />
            </div>

            {/* City, Region, Country */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  placeholder="e.g., Nairobi"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-region">Region</Label>
                <Input
                  id="edit-region"
                  value={editForm.region}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                  placeholder="e.g., Nairobi County"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-country"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  placeholder="e.g., Kenya"
                  required
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-lat">Latitude</Label>
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  value={editForm.geoLat}
                  onChange={(e) => setEditForm({ ...editForm, geoLat: e.target.value })}
                  placeholder="e.g., -1.286389"
                />
                <p className="text-xs text-muted-foreground">Range: -90 to 90</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-lng">Longitude</Label>
                <Input
                  id="edit-lng"
                  type="number"
                  step="any"
                  value={editForm.geoLng}
                  onChange={(e) => setEditForm({ ...editForm, geoLng: e.target.value })}
                  placeholder="e.g., 36.817223"
                />
                <p className="text-xs text-muted-foreground">Range: -180 to 180</p>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Additional information about the property..."
                rows={4}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive properties are hidden from listings
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSaveEdit}
              disabled={saving || !editForm.name || !editForm.addressLine || !editForm.city || !editForm.country}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
