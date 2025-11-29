import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery
} from '@nestjs/swagger';
import { CompoundsService } from '../services/compounds.service';
import { CreateCompoundDto } from '../dto/create-compound.dto';
import { UpdateCompoundDto } from '../dto/update-compound.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

/**
 * Compounds Controller
 * Manages building/location endpoints
 *
 * Author: george1806
 */
@ApiTags('Compounds')
@ApiBearerAuth()
@Controller('compounds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompoundsController {
    constructor(private readonly compoundsService: CompoundsService) {}

    /**
     * Create a new compound
     */
    @Post()
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a new compound' })
    @ApiResponse({ status: 201, description: 'Compound created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async create(
        @TenantId() companyId: string,
        @Body() createCompoundDto: CreateCompoundDto
    ) {
        return this.compoundsService.create(companyId, createCompoundDto);
    }

    /**
     * Get all compounds for the company
     */
    @Get()
    @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.AUDITOR)
    @ApiOperation({ summary: 'Get all compounds for the company' })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Returns all compounds with pagination' })
    async findAll(
        @TenantId() companyId: string,
        @Query('includeInactive') includeInactive?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string
    ) {
        const currentPage = Number(page) || 1;
        const pageLimit = Number(limit) || 10;

        const result = await this.compoundsService.findAll(
            companyId,
            currentPage,
            pageLimit,
            {
                includeInactive: includeInactive === 'true',
                search
            }
        );

        const totalPages = Math.ceil(result.total / pageLimit);

        // Return paginated response format expected by frontend
        return {
            data: result.data,
            meta: {
                total: result.total,
                page: currentPage,
                limit: pageLimit,
                totalPages
            }
        };
    }

    /**
     * Search compounds by name or location
     */
    @Get('search')
    @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.AUDITOR)
    @ApiOperation({ summary: 'Search compounds by name or location' })
    @ApiQuery({ name: 'q', required: true, type: String, description: 'Search term' })
    @ApiResponse({ status: 200, description: 'Returns matching compounds' })
    async search(@TenantId() companyId: string, @Query('q') searchTerm: string) {
        return this.compoundsService.search(companyId, searchTerm);
    }

    /**
     * Count compounds for the company
     */
    @Get('count')
    @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.AUDITOR)
    @ApiOperation({ summary: 'Count active compounds for the company' })
    @ApiResponse({ status: 200, description: 'Returns compound count' })
    async count(@TenantId() companyId: string) {
        const count = await this.compoundsService.countByCompany(companyId);
        return { count };
    }

    /**
     * Get compound by ID
     */
    @Get(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.AUDITOR)
    @ApiOperation({ summary: 'Get compound by ID' })
    @ApiResponse({ status: 200, description: 'Returns compound details' })
    @ApiResponse({ status: 404, description: 'Compound not found' })
    async findOne(@Param('id') id: string, @TenantId() companyId: string) {
        return this.compoundsService.findOne(id, companyId);
    }

    /**
     * Get compound with apartment statistics
     */
    @Get(':id/stats')
    @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.AUDITOR)
    @ApiOperation({ summary: 'Get compound with apartment statistics' })
    @ApiResponse({ status: 200, description: 'Returns compound with apartment details' })
    @ApiResponse({ status: 404, description: 'Compound not found' })
    async findOneWithStats(@Param('id') id: string, @TenantId() companyId: string) {
        return this.compoundsService.findOneWithStats(id, companyId);
    }

    /**
     * Update compound
     */
    @Patch(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Update compound details' })
    @ApiResponse({ status: 200, description: 'Compound updated successfully' })
    @ApiResponse({ status: 404, description: 'Compound not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async update(
        @Param('id') id: string,
        @TenantId() companyId: string,
        @Body() updateCompoundDto: UpdateCompoundDto
    ) {
        return this.compoundsService.update(id, companyId, updateCompoundDto);
    }

    /**
     * Soft delete compound (deactivate)
     */
    @Delete(':id')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate compound (soft delete)' })
    @ApiResponse({ status: 204, description: 'Compound deactivated successfully' })
    @ApiResponse({ status: 404, description: 'Compound not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async remove(@Param('id') id: string, @TenantId() companyId: string) {
        await this.compoundsService.remove(id, companyId);
    }

    /**
     * Activate compound
     */
    @Post(':id/activate')
    @Roles(UserRole.OWNER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Activate a deactivated compound' })
    @ApiResponse({ status: 200, description: 'Compound activated successfully' })
    @ApiResponse({ status: 404, description: 'Compound not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async activate(@Param('id') id: string, @TenantId() companyId: string) {
        return this.compoundsService.activate(id, companyId);
    }
}
