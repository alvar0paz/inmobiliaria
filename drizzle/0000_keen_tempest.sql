CREATE TABLE `enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`phone` text NOT NULL,
	`project` text NOT NULL,
	`city` text NOT NULL,
	`assets` text NOT NULL,
	`message` text NOT NULL,
	`source` text NOT NULL,
	`language` text NOT NULL,
	`demo_unit` text NOT NULL,
	`demo_type` text NOT NULL,
	`consent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `enquiries_created` ON `enquiries` (`created_at`);--> statement-breakpoint
CREATE TABLE `enquiry_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
