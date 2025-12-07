import { Repository, FindOptionsWhere, SelectQueryBuilder, ObjectLiteral, FindOptionsOrder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PaginatedResult, PaginationParams } from './pagination.types';
import { PaginationService } from './pagination.service';

/**
 * Base Repository
 * Abstract class for repositories with built-in pagination support
 *
 * Design Pattern: Template Method Pattern
 * - Subclasses implement specific queries
 * - Base class handles pagination boilerplate
 *
 * Follows:
 * - DRY: No pagination code duplication
 * - SRP: Each method has single responsibility
 * - Open/Closed: Easy to extend for new entities
 */
export abstract class BaseRepository<Entity extends ObjectLiteral> {
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: Repository<Entity>,
    protected readonly paginationService: PaginationService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Paginate query builder results
   * Generic method used by subclasses
   */
  async paginate<T extends ObjectLiteral = Entity>(
    queryBuilder: SelectQueryBuilder<T>,
    params: PaginationParams,
  ): Promise<PaginatedResult<T>> {
    const skip = (params.page - 1) * params.limit;

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(params.limit);

    // Get paginated data
    const data = await queryBuilder.getMany();

    // Calculate metadata
    const pagination = this.paginationService.calculateMetadata(
      params.page,
      params.limit,
      total,
    );

    return { data, pagination };
  }

  /**
   * Find with pagination using simple find options
   * Useful for simple queries
   */
  async findWithPagination(
    where: FindOptionsWhere<Entity>,
    params: PaginationParams,
    relations?: string[],
    order?: FindOptionsOrder<Entity>,
  ): Promise<PaginatedResult<Entity>> {
    const skip = (params.page - 1) * params.limit;

    // Get total count
    const total = await this.repository.count({ where });

    // Get paginated data
    const data = await this.repository.find({
      where,
      skip,
      take: params.limit,
      relations,
      order,
    });

    // Calculate metadata
    const pagination = this.paginationService.calculateMetadata(
      params.page,
      params.limit,
      total,
    );

    return { data, pagination };
  }

  /**
   * Count records matching criteria
   */
  async count(where: FindOptionsWhere<Entity>): Promise<number> {
    return this.repository.count({ where });
  }

  /**
   * Find one record
   */
  async findOne(where: FindOptionsWhere<Entity>, relations?: string[]): Promise<Entity | null> {
    return this.repository.findOne({ where, relations });
  }

  /**
   * Save entity
   */
  async save(entity: Entity): Promise<Entity> {
    return this.repository.save(entity);
  }

  /**
   * Save multiple entities
   */
  async saveMany(entities: Entity[]): Promise<Entity[]> {
    return this.repository.save(entities);
  }

  /**
   * Remove entity (hard delete)
   */
  async remove(entity: Entity): Promise<Entity> {
    return this.repository.remove(entity);
  }

  /**
   * Remove multiple entities
   */
  async removeMany(entities: Entity[]): Promise<Entity[]> {
    return this.repository.remove(entities);
  }
}
