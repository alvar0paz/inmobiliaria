import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const enquiries = sqliteTable('enquiries', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  name: text('name').notNull(), email: text('email').notNull(),
  company: text('company').notNull(), phone: text('phone').notNull(),
  project: text('project').notNull(), city: text('city').notNull(),
  assets: text('assets').notNull(), message: text('message').notNull(),
  source: text('source').notNull(), language: text('language').notNull(),
  demoUnit: text('demo_unit').notNull(), demoType: text('demo_type').notNull(),
  consentAt: integer('consent_at').notNull(),
}, t => [index('enquiries_created').on(t.createdAt)]);
export const enquiryLimits = sqliteTable('enquiry_limits', {
  key: text('key').primaryKey(), hits: integer('hits').notNull(), expiresAt: integer('expires_at').notNull(),
});
