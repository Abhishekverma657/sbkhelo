ALTER TABLE `user` ADD `agnetcomm` FLOAT NOT NULL DEFAULT '0' AFTER `winamount`;

ALTER TABLE `admin_setting` ADD `claim_opten` VARCHAR(20) NULL DEFAULT NULL AFTER `newuser_bonus`, ADD `claim_close` VARCHAR(20) NULL DEFAULT NULL AFTER `claim_opten`;
ALTER TABLE `admin_setting` CHANGE `claim_opten` `claim_open` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;

ALTER TABLE `bet_c` ADD `status` INT(3) NULL DEFAULT '0' AFTER `amount`;



ALTER TABLE `bet_c` ADD `userwallet` FLOAT NULL DEFAULT '0' AFTER `amount`;
ALTER TABLE `bet_c` ADD `claimtime` VARCHAR(20) NULL DEFAULT NULL AFTER `time`;
ALTER TABLE `bet_c` CHANGE `claimtime` `claimtime` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;

ALTER TABLE `betting` ADD `admin_id` INT(12) NOT NULL DEFAULT '0' AFTER `userid`;



ALTER TABLE `bet_result_set` ADD `xvalue` INT(4) NOT NULL DEFAULT '1' AFTER `winner`;
ALTER TABLE `admin_setting` ADD `request` INT(5) NOT NULL DEFAULT '1' AFTER `id`;