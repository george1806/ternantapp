import { PartialType } from '@nestjs/swagger';
import { CreateApartmentDto } from './create-apartment.dto';
import { OmitType } from '@nestjs/swagger';

/**
 * Update Apartment DTO
 * All fields are optional except compoundId cannot be changed after creation
 */
export class UpdateApartmentDto extends PartialType(
    OmitType(CreateApartmentDto, ['compoundId'] as const)
) {}
