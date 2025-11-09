DROP INDEX "name_idx";--> statement-breakpoint
DROP INDEX "persona-questionnaire_session_token_unique";--> statement-breakpoint
DROP INDEX "persona-questionnaire_user_email_unique";--> statement-breakpoint
CREATE INDEX `name_idx` ON `persona-questionnaire_post` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_session_token_unique` ON `persona-questionnaire_session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `persona-questionnaire_user_email_unique` ON `persona-questionnaire_user` (`email`);--> statement-breakpoint