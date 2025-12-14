import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../../common/decorators/tenant.decorator';
import { UserRole } from '../../../common/enums';
import { User } from '../entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    getProfile(@CurrentUser() currentUser: User) {
        return this.usersService.getProfile(currentUser);
    }

    @Post()
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new user (Owner/Admin only)' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 409, description: 'User with this email already exists' })
    create(
        @TenantId() companyId: string,
        @CurrentUser() currentUser: User,
        @Body() createUserDto: CreateUserDto
    ) {
        return this.usersService.create(companyId, createUserDto, currentUser);
    }

    @Get()
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all users (Admin: all companies, Owner: own company)' })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    findAll(
        @TenantId() companyId: string,
        @CurrentUser() currentUser: User,
        @Query('includeInactive') includeInactive?: boolean
    ) {
        return this.usersService.findAll(companyId, currentUser, includeInactive);
    }

    @Get(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    findOne(
        @TenantId() companyId: string,
        @CurrentUser() currentUser: User,
        @Param('id') id: string
    ) {
        return this.usersService.findOne(id, companyId, currentUser);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update user (Owner/Admin only)' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    update(
        @TenantId() companyId: string,
        @CurrentUser() currentUser: User,
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto
    ) {
        return this.usersService.update(id, companyId, updateUserDto, currentUser);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate user (Owner/Admin only)' })
    @ApiResponse({ status: 204, description: 'User deactivated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    remove(
        @TenantId() companyId: string,
        @CurrentUser() currentUser: User,
        @Param('id') id: string
    ) {
        return this.usersService.remove(id, companyId, currentUser);
    }

    @Post(':id/activate')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Activate user (Owner/Admin only)' })
    @ApiResponse({ status: 200, description: 'User activated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    activate(
        @TenantId() companyId: string,
        @CurrentUser() currentUser: User,
        @Param('id') id: string
    ) {
        return this.usersService.activate(id, companyId, currentUser);
    }
}
