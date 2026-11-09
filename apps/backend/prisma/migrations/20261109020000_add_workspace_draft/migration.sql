-- CreateTable
CREATE TABLE `workspace_drafts` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `round_id` VARCHAR(191) NOT NULL,
    `source_code` LONGTEXT NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `last_edited_by_participant_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workspace_drafts_team_id_idx`(`team_id`),
    INDEX `workspace_drafts_round_id_idx`(`round_id`),
    UNIQUE INDEX `workspace_drafts_team_id_round_id_key`(`team_id`, `round_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `workspace_drafts` ADD CONSTRAINT `workspace_drafts_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_drafts` ADD CONSTRAINT `workspace_drafts_round_id_fkey` FOREIGN KEY (`round_id`) REFERENCES `competition_rounds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
