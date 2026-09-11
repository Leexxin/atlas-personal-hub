CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '其他' NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_resources_user_kind` ON `resources` (`user_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_resources_user_updated` ON `resources` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`page_name` text DEFAULT '我的工具站' NOT NULL,
	`greeting` text DEFAULT '今天想从哪里开始？' NOT NULL,
	`accent` text DEFAULT 'cyan' NOT NULL,
	`density` text DEFAULT 'comfortable' NOT NULL,
	`updated_at` integer NOT NULL
);
