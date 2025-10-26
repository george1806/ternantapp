import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Refresh token DTO
 * Author: george1806
 */
export class RefreshTokenDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}
