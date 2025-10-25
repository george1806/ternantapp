import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Company } from '../entities/company.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import slugify from 'slugify';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Create a new company
   */
  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if slug already exists
    const existing = await this.companyRepository.findOne({
      where: { slug: createCompanyDto.slug },
    });

    if (existing) {
      throw new ConflictException('Company with this slug already exists');
    }

    // Create company with default settings
    const company = this.companyRepository.create({
      ...createCompanyDto,
      slug: slugify(createCompanyDto.slug, { lower: true, strict: true }),
      reminderPreferences: {
        enabled: true,
        daysBefore: 7,
        daysAfter: 3,
        sendTime: '09:00',
        ccEmails: [],
      },
    });

    const saved = await this.companyRepository.save(company);

    // Cache the company
    await this.cacheCompany(saved);

    return saved;
  }

  /**
   * Find company by ID with caching
   */
  async findOne(id: string): Promise<Company> {
    const cacheKey = `company:${id}`;

    // Try cache first
    const cached = await this.cacheManager.get<Company>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const company = await this.companyRepository.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Cache for 5 minutes
    await this.cacheCompany(company);

    return company;
  }

  /**
   * Find company by slug with caching
   */
  async findBySlug(slug: string): Promise<Company> {
    const cacheKey = `company:slug:${slug}`;

    // Try cache first
    const cached = await this.cacheManager.get<Company>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const company = await this.companyRepository.findOne({ where: { slug } });

    if (!company) {
      throw new NotFoundException(`Company with slug ${slug} not found`);
    }

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, company, 300000);
    await this.cacheManager.set(`company:${company.id}`, company, 300000);

    return company;
  }

  /**
   * Update company
   */
  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    // If slug is being updated, check uniqueness
    if (updateCompanyDto.slug && updateCompanyDto.slug !== company.slug) {
      const existing = await this.companyRepository.findOne({
        where: { slug: updateCompanyDto.slug },
      });

      if (existing) {
        throw new ConflictException('Company with this slug already exists');
      }
    }

    // Update company
    Object.assign(company, updateCompanyDto);
    const updated = await this.companyRepository.save(company);

    // Invalidate cache
    await this.invalidateCache(id, company.slug);

    // Re-cache
    await this.cacheCompany(updated);

    return updated;
  }

  /**
   * Soft delete company
   */
  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    company.isActive = false;
    await this.companyRepository.save(company);

    // Invalidate cache
    await this.invalidateCache(id, company.slug);
  }

  /**
   * Cache company by ID and slug
   */
  private async cacheCompany(company: Company): Promise<void> {
    const ttl = 300000; // 5 minutes
    await this.cacheManager.set(`company:${company.id}`, company, ttl);
    await this.cacheManager.set(`company:slug:${company.slug}`, company, ttl);
  }

  /**
   * Invalidate company cache
   */
  private async invalidateCache(id: string, slug?: string): Promise<void> {
    await this.cacheManager.del(`company:${id}`);
    if (slug) {
      await this.cacheManager.del(`company:slug:${slug}`);
    }
  }
}
