-- AlterTable
ALTER TABLE `teams` ADD COLUMN `is_demo` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `competition_state` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('STANDBY', 'ROUND_1_ACTIVE', 'ROUND_1_EVALUATION', 'ROUND_2_ACTIVE', 'ROUND_2_EVALUATION', 'ROUND_3_ACTIVE', 'FINAL_EVALUATION', 'COMPLETED') NOT NULL DEFAULT 'STANDBY',
    `current_round_number` INTEGER NULL,
    `is_paused` BOOLEAN NOT NULL DEFAULT false,
    `started_at` DATETIME(3) NULL,
    `deadline_at` DATETIME(3) NULL,
    `paused_at` DATETIME(3) NULL,
    `remaining_duration_seconds` INTEGER NULL,
    `total_duration_seconds` INTEGER NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
