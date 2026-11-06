-- ==============================================================================
-- IGNITRON 2K26 — INITIAL DATABASE MIGRATION
-- Migration Name: 20261031000000_init
-- ==============================================================================

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `team_code` VARCHAR(191) NOT NULL,
    `team_name` VARCHAR(191) NOT NULL,
    `institution` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'DISQUALIFIED', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teams_team_code_key`(`team_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `participants` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `student_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `participants_email_key`(`email`),
    INDEX `participants_team_id_idx`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORGANIZER', 'JUDGE') NOT NULL DEFAULT 'ORGANIZER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_accounts_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_rounds` (
    `id` VARCHAR(191) NOT NULL,
    `round_number` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `duration_minutes` INTEGER NOT NULL,
    `maximum_marks` DECIMAL(6, 2) NOT NULL,
    `status` ENUM('UPCOMING', 'ACTIVE', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'UPCOMING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competition_rounds_round_number_key`(`round_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_round_progress` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `eligibility_status` ENUM('PENDING', 'ELIGIBLE', 'INELIGIBLE') NOT NULL DEFAULT 'PENDING',
    `participation_status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'DISQUALIFIED', 'TIMED_OUT') NOT NULL DEFAULT 'NOT_STARTED',
    `score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `started_at` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `evaluated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `team_round_progress_team_id_idx`(`team_id`),
    INDEX `team_round_progress_round_id_idx`(`round_id`),
    UNIQUE INDEX `team_round_progress_team_id_round_id_key`(`team_id`, `round_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `source_code` LONGTEXT NOT NULL,
    `submission_status` ENUM('PENDING', 'EVALUATING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'EVALUATED') NOT NULL DEFAULT 'PENDING',
    `score` DECIMAL(6, 2) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `evaluated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `submissions_team_id_idx`(`team_id`),
    INDEX `submissions_round_id_idx`(`round_id`),
    INDEX `submissions_submission_status_idx`(`submission_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `submission_id` VARCHAR(191) NOT NULL,
    `evaluator_id` VARCHAR(191) NULL,
    `total_score` DECIMAL(6, 2) NOT NULL,
    `feedback` TEXT NULL,
    `evaluated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `evaluations_submission_id_idx`(`submission_id`),
    INDEX `evaluations_evaluator_id_idx`(`evaluator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actor_type` ENUM('SYSTEM', 'ADMIN', 'TEAM') NOT NULL,
    `actor_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_actor_type_actor_id_idx`(`actor_type`, `actor_id`),
    INDEX `activity_logs_action_idx`(`action`),
    INDEX `activity_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `participants` ADD CONSTRAINT `participants_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_round_progress` ADD CONSTRAINT `team_round_progress_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_round_progress` ADD CONSTRAINT `team_round_progress_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_evaluator_id_fkey` FOREIGN KEY (`evaluator_id`) REFERENCES `admin_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

