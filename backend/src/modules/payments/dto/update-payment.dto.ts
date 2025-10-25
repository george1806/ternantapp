import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto';

/**
 * DTO for updating a payment
 * Author: george1806
 */
export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
