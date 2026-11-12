-- AlterTable
ALTER TABLE `team_round_progress` ADD COLUMN `score_breakdown` JSON NULL;

-- AlterTable
ALTER TABLE `evaluations` ADD COLUMN `team_id` VARCHAR(191) NULL,
    ADD COLUMN `round_number` INTEGER NULL,
    ADD COLUMN `criteria_scores` JSON NULL;

-- CreateIndex
CREATE INDEX `evaluations_team_id_idx` ON `evaluations`(`team_id`);
CREATE INDEX `evaluations_round_number_idx` ON `evaluations`(`round_number`);

-- AlterTable
ALTER TABLE `workspace_drafts` ADD COLUMN `case_number` INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX `workspace_drafts_team_id_round_id_key` ON `workspace_drafts`;

-- CreateIndex
CREATE UNIQUE INDEX `workspace_drafts_team_id_round_id_case_number_key` ON `workspace_drafts`(`team_id`, `round_id`, `case_number`);

-- CreateTable
CREATE TABLE `questions` (
    `id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `type` ENUM('MCQ', 'BUG_HUNT', 'CODING_CASE') NOT NULL DEFAULT 'MCQ',
    `order_number` INTEGER NOT NULL,
    `case_number` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `starter_code` LONGTEXT NULL,
    `language` VARCHAR(191) NULL,
    `marks` DECIMAL(6, 2) NOT NULL DEFAULT 2.00,
    `options` JSON NULL,
    `correct_option` INTEGER NULL,
    `explanation` TEXT NULL,
    `sample_test_cases` JSON NULL,
    `hidden_test_cases` JSON NULL,
    `rubric` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `questions_round_id_idx`(`round_id`),
    INDEX `questions_type_idx`(`type`),
    UNIQUE INDEX `questions_round_id_order_number_key`(`round_id`, `order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_mcq_answers` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `selected_option` INTEGER NULL,
    `is_flagged` BOOLEAN NOT NULL DEFAULT false,
    `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `team_mcq_answers_team_id_idx`(`team_id`),
    INDEX `team_mcq_answers_question_id_idx`(`question_id`),
    UNIQUE INDEX `team_mcq_answers_team_id_question_id_key`(`team_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `submissions` ADD COLUMN `question_id` VARCHAR(191) NULL,
    ADD COLUMN `test_case_results` JSON NULL;

-- CreateIndex
CREATE INDEX `submissions_question_id_idx` ON `submissions`(`question_id`);

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_mcq_answers` ADD CONSTRAINT `team_mcq_answers_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_mcq_answers` ADD CONSTRAINT `team_mcq_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
