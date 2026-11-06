-- AlterTable
ALTER TABLE `teams` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `last_login_at` DATETIME(3) NULL,
    ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `password_hash` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `participants` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `admin_accounts` ADD COLUMN `last_login_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `team_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `participant_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'ENDED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `termination_reason` ENUM('USER_LOGOUT', 'TIMEOUT', 'ADMIN_REVOKED', 'DISPLACED') NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `login_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `logout_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `team_sessions_team_id_status_idx`(`team_id`, `status`),
    INDEX `team_sessions_participant_id_status_idx`(`participant_id`, `status`),
    INDEX `team_sessions_last_activity_at_idx`(`last_activity_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `team_sessions` ADD CONSTRAINT `team_sessions_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_sessions` ADD CONSTRAINT `team_sessions_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
