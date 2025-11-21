CREATE TABLE `persona-questionnaire_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `name_idx` ON `persona-questionnaire_post` (`name`);--> statement-breakpoint
CREATE TABLE `persona-questionnaire_account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `persona-questionnaire_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `persona-questionnaire_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_session_token_unique` ON `persona-questionnaire_session` (`token`);--> statement-breakpoint
CREATE TABLE `persona-questionnaire_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_user_email_unique` ON `persona-questionnaire_user` (`email`);--> statement-breakpoint
CREATE TABLE `persona-questionnaire_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_question_type` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`component_name` text NOT NULL,
	`config_schema` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_question_type_code_unique` ON `persona-questionnaire_question_type` (`code`);--> statement-breakpoint
CREATE TABLE `persona-questionnaire_question_bank_item` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`prompt` text NOT NULL,
	`question_type_code` text NOT NULL,
	`config_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`question_type_code`) REFERENCES `persona-questionnaire_question_type`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_question_bank_item_code_unique` ON `persona-questionnaire_question_bank_item` (`code`);--> statement-breakpoint
CREATE TABLE `persona-questionnaire_question_option` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `persona-questionnaire_question_bank_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_questionnaire` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT false NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_questionnaire_slug_unique` ON `persona-questionnaire_questionnaire` (`slug`);--> statement-breakpoint
CREATE TABLE `persona-questionnaire_questionnaire_item` (
	`id` text PRIMARY KEY NOT NULL,
	`questionnaire_version_id` text NOT NULL,
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`section` text,
	`is_required` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`questionnaire_version_id`) REFERENCES `persona-questionnaire_questionnaire_version`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `persona-questionnaire_question_bank_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_questionnaire_version` (
	`id` text PRIMARY KEY NOT NULL,
	`questionnaire_id` text NOT NULL,
	`version` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`metadata_json` text,
	`published_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `persona-questionnaire_questionnaire`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_user_questionnaire_access` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`questionnaire_id` text NOT NULL,
	`granted_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `persona-questionnaire_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`questionnaire_id`) REFERENCES `persona-questionnaire_questionnaire`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_subject_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_type` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`preferred_locale` text,
	`metadata_json` text,
	`consent_flags_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `persona-questionnaire_user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "subject_type_check" CHECK("persona-questionnaire_subject_profile"."subject_type" IN ('human', 'llm'))
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_assessment_session` (
	`id` text PRIMARY KEY NOT NULL,
	`questionnaire_version_id` text NOT NULL,
	`subject_profile_id` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	`metadata_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`questionnaire_version_id`) REFERENCES `persona-questionnaire_questionnaire_version`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_profile_id`) REFERENCES `persona-questionnaire_subject_profile`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `persona-questionnaire_user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `persona-questionnaire_response` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_option_id` text,
	`value_numeric` integer,
	`value_boolean` integer,
	`value_text` text,
	`raw_payload_json` text,
	`value_type` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`assessment_session_id`) REFERENCES `persona-questionnaire_assessment_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `persona-questionnaire_question_bank_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selected_option_id`) REFERENCES `persona-questionnaire_question_option`(`id`) ON UPDATE no action ON DELETE set null
);
