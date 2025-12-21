'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, DollarSign, Users, Calendar, Edit, Building2 } from 'lucide-react';
import { compoundsService } from '@/services/compounds.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
      setCompound(response.data as any);
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
          <Button className="hidden sm:flex">
            <Edit className="mr-2 h-4 w-4" />
            Edit Property
          </Button>
          <Button size="icon" className="sm:hidden">
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
    </div>
  );
}
