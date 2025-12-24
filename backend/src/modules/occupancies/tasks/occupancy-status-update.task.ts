import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Occupancy } from '../entities/occupancy.entity';
import { Apartment } from '../../apartments/entities/apartment.entity';

/**
 * Occupancy Status Auto-Update Task
 *
 * Automatically updates occupancy statuses from 'pending' to 'active'
 * when the lease start date arrives.
 *
 * Configurable via environment variable: AUTO_UPDATE_OCCUPANCY_STATUS
 * - true: Automatically update statuses (default)
 * - false: Manual update required
 *
 * Runs daily at 1:00 AM
 *
 * @author george1806
 */
@Injectable()
export class OccupancyStatusUpdateTask {
    private readonly logger = new Logger(OccupancyStatusUpdateTask.name);
    private readonly autoUpdateEnabled: boolean;

    constructor(
        @InjectRepository(Occupancy)
        private occupanciesRepository: Repository<Occupancy>,
        @InjectRepository(Apartment)
        private apartmentsRepository: Repository<Apartment>,
        private configService: ConfigService,
    ) {
        this.autoUpdateEnabled = this.configService.get<string>('AUTO_UPDATE_OCCUPANCY_STATUS', 'true') === 'true';
        this.logger.log(`Auto-update occupancy status: ${this.autoUpdateEnabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Run daily at 1:00 AM to update pending occupancies to active
     */
    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async handleOccupancyStatusUpdate() {
        if (!this.autoUpdateEnabled) {
            this.logger.debug('Auto-update is disabled. Skipping occupancy status update.');
            return;
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            this.logger.log('Starting automatic occupancy status update...');

            // Find all pending occupancies where lease start date has arrived
            const pendingOccupancies = await this.occupanciesRepository.find({
                where: {
                    status: 'pending',
                    isActive: true,
                    leaseStartDate: LessThanOrEqual(today),
                },
                relations: ['apartment'],
            });

            if (pendingOccupancies.length === 0) {
                this.logger.log('No pending occupancies found to activate.');
                return;
            }

            this.logger.log(`Found ${pendingOccupancies.length} pending occupancies to activate.`);

            let successCount = 0;
            let failureCount = 0;

            for (const occupancy of pendingOccupancies) {
                try {
                    // Update occupancy status to active
                    occupancy.status = 'active';
                    await this.occupanciesRepository.save(occupancy);

                    // Update apartment status to occupied
                    if (occupancy.apartment) {
                        await this.apartmentsRepository.update(
                            { id: occupancy.apartmentId },
                            { status: 'occupied' }
                        );
                    }

                    successCount++;
                    this.logger.debug(`Activated occupancy ${occupancy.id} for apartment ${occupancy.apartmentId}`);
                } catch (error) {
                    failureCount++;
                    this.logger.error(
                        `Failed to activate occupancy ${occupancy.id}: ${error.message}`,
                        error.stack
                    );
                }
            }

            this.logger.log(
                `Occupancy status update completed. Success: ${successCount}, Failed: ${failureCount}`
            );
        } catch (error) {
            this.logger.error('Error during occupancy status update task:', error.stack);
        }
    }

    /**
     * Manual trigger for testing purposes
     * Can be called via API endpoint if needed
     */
    async triggerManualUpdate(): Promise<{ success: number; failed: number }> {
        if (!this.autoUpdateEnabled) {
            throw new Error('Auto-update is disabled. Cannot trigger manual update.');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pendingOccupancies = await this.occupanciesRepository.find({
            where: {
                status: 'pending',
                isActive: true,
                leaseStartDate: LessThanOrEqual(today),
            },
            relations: ['apartment'],
        });

        let successCount = 0;
        let failureCount = 0;

        for (const occupancy of pendingOccupancies) {
            try {
                occupancy.status = 'active';
                await this.occupanciesRepository.save(occupancy);

                if (occupancy.apartment) {
                    await this.apartmentsRepository.update(
                        { id: occupancy.apartmentId },
                        { status: 'occupied' }
                    );
                }

                successCount++;
            } catch (error) {
                failureCount++;
                this.logger.error(`Failed to activate occupancy ${occupancy.id}: ${error.message}`);
            }
        }

        return { success: successCount, failed: failureCount };
    }
}
