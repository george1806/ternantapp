import { PartialType } from '@nestjs/swagger';
import { CreateOccupancyDto } from './create-occupancy.dto';

export class UpdateOccupancyDto extends PartialType(CreateOccupancyDto) {}
