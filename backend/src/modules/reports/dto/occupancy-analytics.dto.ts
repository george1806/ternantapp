import { ApiProperty } from '@nestjs/swagger';

/**
 * Occupancy Analytics DTO
 * Occupancy rates and trends over time
 *
 * Author: george1806
 */
export class OccupancyAnalyticsDto {
    @ApiProperty({ description: 'Current occupancy rate', example: 92.5 })
    currentOccupancyRate: number;

    @ApiProperty({ description: 'Total units', example: 150 })
    totalUnits: number;

    @ApiProperty({ description: 'Occupied units', example: 139 })
    occupiedUnits: number;

    @ApiProperty({ description: 'Vacant units', example: 11 })
    vacantUnits: number;

    @ApiProperty({ description: 'Average lease duration in months', example: 14.5 })
    averageLeaseDuration: number;

    @ApiProperty({ description: 'Average days to fill vacancy', example: 12 })
    averageDaysToFill: number;

    @ApiProperty({
        description: 'Monthly occupancy trend',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                month: { type: 'string', example: '2024-01' },
                occupancyRate: { type: 'number', example: 90.5 },
                occupied: { type: 'number', example: 136 },
                vacant: { type: 'number', example: 14 }
            }
        }
    })
    monthlyTrend: Array<{
        month: string;
        occupancyRate: number;
        occupied: number;
        vacant: number;
    }>;

    @ApiProperty({
        description: 'Occupancy by compound',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                compoundId: { type: 'string', example: 'uuid' },
                compoundName: { type: 'string', example: 'Sunrise Apartments' },
                totalUnits: { type: 'number', example: 50 },
                occupied: { type: 'number', example: 45 },
                occupancyRate: { type: 'number', example: 90.0 }
            }
        }
    })
    byCompound: Array<{
        compoundId: string;
        compoundName: string;
        totalUnits: number;
        occupied: number;
        occupancyRate: number;
    }>;

    @ApiProperty({ description: 'Tenant turnover rate', example: 15.5 })
    turnoverRate: number;
}
