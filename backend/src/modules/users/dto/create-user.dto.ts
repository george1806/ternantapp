import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsString,
    MinLength,
    IsOptional,
    MaxLength,
    Matches
} from 'class-validator';
import { UserRole } from '../../../common/enums';

export class CreateUserDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain uppercase, lowercase, number and special character'
    })
    password: string;

    @ApiProperty({ enum: UserRole, example: UserRole.WORKER })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    @IsOptional()
    phone?: string;
}
