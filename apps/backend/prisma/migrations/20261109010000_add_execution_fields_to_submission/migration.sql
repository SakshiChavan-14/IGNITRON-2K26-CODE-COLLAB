-- AlterTable
ALTER TABLE `submissions`
    MODIFY `round_id` VARCHAR(191) NULL,
    ADD COLUMN `stdin` TEXT NULL,
    ADD COLUMN `stdout` LONGTEXT NULL,
    ADD COLUMN `stderr` LONGTEXT NULL,
    ADD COLUMN `compile_output` LONGTEXT NULL,
    ADD COLUMN `execution_time` DECIMAL(8, 4) NULL,
    ADD COLUMN `memory_usage` INTEGER NULL,
    ADD COLUMN `judge0_token` VARCHAR(191) NULL,
    ADD COLUMN `is_test_run` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `submissions_is_test_run_idx` ON `submissions`(`is_test_run`);
