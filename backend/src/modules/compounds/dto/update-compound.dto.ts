import { PartialType } from '@nestjs/swagger';
import { CreateCompoundDto } from './create-compound.dto';

/**
 * Update Compound DTO
 * Author: george1806
 */
export class UpdateCompoundDto extends PartialType(CreateCompoundDto) {}
