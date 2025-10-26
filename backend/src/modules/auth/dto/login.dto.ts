import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Login DTO
 * Author: george1806
 */
export class LoginDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    @MinLength(8)
    password: string;
}
