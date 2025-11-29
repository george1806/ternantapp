import {
    IsString,
    IsDateString,
    IsArray,
    IsNumber,
    IsOptional,
    IsEnum,
    ValidateNested,
    Min,
    MaxLength,
    Custom
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class LineItemDto {
    @ApiProperty({
        description: 'Item description',
        example: 'Monthly Rent - January 2024'
    })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Quantity', example: 1, minimum: 0.01 })
    @IsNumber()
    @Min(0.01, { message: 'Quantity must be greater than 0' })
    quantity: number;

    @ApiProperty({ description: 'Unit price', example: 1500.0, minimum: 0.01 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Unit price must be greater than 0' })
    unitPrice: number;

    @ApiProperty({ description: 'Total amount (quantity * unitPrice)', example: 1500.0, minimum: 0.01 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Line item amount must be greater than 0' })
    amount: number;

    @ApiPropertyOptional({
        description: 'Line item type',
        enum: ['rent', 'utility', 'maintenance', 'other']
    })
    @IsOptional()
    @IsEnum(['rent', 'utility', 'maintenance', 'other'])
    type?: 'rent' | 'utility' | 'maintenance' | 'other';
}

export class CreateInvoiceDto {
    @ApiProperty({
        description: 'Invoice number (unique within company)',
        example: 'INV-2024-001'
    })
    @IsString()
    @MaxLength(50)
    invoiceNumber: string;

    @ApiProperty({
        description: 'Occupancy ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsString()
    occupancyId: string;

    @ApiProperty({
        description: 'Tenant ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsString()
    tenantId: string;

    @ApiProperty({
        description: 'Invoice date',
        example: '2024-01-01'
    })
    @IsDateString()
    invoiceDate: string;

    @ApiProperty({
        description: 'Payment due date (must be on or after invoice date)',
        example: '2024-01-05'
    })
    @IsDateString()
    @Custom(({ value }, args) => {
        const dueDate = new Date(value);
        const invoiceDate = new Date((args.object as any).invoiceDate);
        if (dueDate < invoiceDate) {
            throw new Error('Due date must be on or after invoice date');
        }
        return true;
    })
    dueDate: string;

    @ApiPropertyOptional({
        description: 'Invoice status',
        enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
        default: 'draft'
    })
    @IsOptional()
    @IsEnum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' = 'draft';

    @ApiProperty({
        description: 'Line items',
        type: [LineItemDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    lineItems: LineItemDto[];

    @ApiProperty({
        description: 'Subtotal amount',
        example: 1500.0,
        minimum: 0.01
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Subtotal must be greater than 0' })
    subtotal: number;

    @ApiPropertyOptional({
        description: 'Tax amount',
        example: 0,
        default: 0,
        minimum: 0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0, { message: 'Tax amount cannot be negative' })
    taxAmount: number = 0;

    @ApiProperty({
        description: 'Total amount (subtotal + tax)',
        example: 1650.0,
        minimum: 0.01
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Total amount must be greater than 0' })
    totalAmount: number;

    @ApiPropertyOptional({
        description: 'Amount already paid',
        example: 0,
        default: 0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    amountPaid: number = 0;

    @ApiPropertyOptional({
        description: 'Additional notes'
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
