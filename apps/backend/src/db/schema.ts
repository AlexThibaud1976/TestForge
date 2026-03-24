import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  smallint,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('trial'), // 'trial' | 'starter' | 'pro'
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  connections: many(sourceConnections),
  llmConfigs: many(llmConfigs),
  userStories: many(userStories),
}));

// ─── Team Members ─────────────────────────────────────────────────────────────

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // Supabase Auth user ID
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  invitedBy: uuid('invited_by'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
}));

// ─── LLM Configs ─────────────────────────────────────────────────────────────

export const llmConfigs = pgTable(
  'llm_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'openai' | 'azure_openai' | 'anthropic'
    model: text('model').notNull(),
    encryptedApiKey: text('encrypted_api_key').notNull(),
    azureEndpoint: text('azure_endpoint'),
    azureDeployment: text('azure_deployment'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Un seul défaut par équipe
    oneDefaultPerTeam: uniqueIndex('one_default_per_team').on(table.teamId, table.isDefault),
  }),
);

export const llmConfigsRelations = relations(llmConfigs, ({ one }) => ({
  team: one(teams, { fields: [llmConfigs.teamId], references: [teams.id] }),
}));

// ─── Source Connections ────────────────────────────────────────────────────────

export const sourceConnections = pgTable('source_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'jira' | 'azure_devops'
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  encryptedCredentials: text('encrypted_credentials').notNull(),
  projectKey: text('project_key').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sourceConnectionsRelations = relations(sourceConnections, ({ one, many }) => ({
  team: one(teams, { fields: [sourceConnections.teamId], references: [teams.id] }),
  userStories: many(userStories),
}));

// ─── User Stories ─────────────────────────────────────────────────────────────

export const userStories = pgTable(
  'user_stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    connectionId: uuid('connection_id').references(() => sourceConnections.id),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    acceptanceCriteria: text('acceptance_criteria'),
    labels: text('labels').array().notNull().default([]),
    status: text('status'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    connectionExternalUnique: uniqueIndex('user_stories_connection_external_idx').on(
      table.connectionId,
      table.externalId,
    ),
  }),
);

export const userStoriesRelations = relations(userStories, ({ one, many }) => ({
  team: one(teams, { fields: [userStories.teamId], references: [teams.id] }),
  connection: one(sourceConnections, {
    fields: [userStories.connectionId],
    references: [sourceConnections.id],
  }),
  analyses: many(analyses),
}));

// ─── Analyses ─────────────────────────────────────────────────────────────────

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userStoryId: uuid('user_story_id').references(() => userStories.id),
  teamId: uuid('team_id').references(() => teams.id),
  scoreGlobal: smallint('score_global').notNull(),
  scoreClarity: smallint('score_clarity').notNull(),
  scoreCompleteness: smallint('score_completeness').notNull(),
  scoreTestability: smallint('score_testability').notNull(),
  scoreEdgeCases: smallint('score_edge_cases').notNull(),
  scoreAcceptanceCriteria: smallint('score_acceptance_criteria').notNull(),
  suggestions: jsonb('suggestions').notNull().default([]),
  improvedVersion: text('improved_version'),
  llmProvider: text('llm_provider').notNull(),
  llmModel: text('llm_model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  userStory: one(userStories, { fields: [analyses.userStoryId], references: [userStories.id] }),
  team: one(teams, { fields: [analyses.teamId], references: [teams.id] }),
  generations: many(generations),
}));

// ─── Generations ──────────────────────────────────────────────────────────────

export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').references(() => analyses.id),
  teamId: uuid('team_id').references(() => teams.id),
  framework: text('framework').notNull().default('playwright'),
  language: text('language').notNull().default('typescript'),
  usedImprovedVersion: boolean('used_improved_version').notNull().default(false),
  llmProvider: text('llm_provider').notNull(),
  llmModel: text('llm_model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'success' | 'error'
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const generationsRelations = relations(generations, ({ one, many }) => ({
  analysis: one(analyses, { fields: [generations.analysisId], references: [analyses.id] }),
  team: one(teams, { fields: [generations.teamId], references: [teams.id] }),
  files: many(generatedFiles),
}));

// ─── Generated Files ──────────────────────────────────────────────────────────

export const generatedFiles = pgTable('generated_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  generationId: uuid('generation_id')
    .notNull()
    .references(() => generations.id, { onDelete: 'cascade' }),
  fileType: text('file_type').notNull(), // 'page_object' | 'test_spec' | 'fixtures'
  filename: text('filename').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const generatedFilesRelations = relations(generatedFiles, ({ one }) => ({
  generation: one(generations, {
    fields: [generatedFiles.generationId],
    references: [generations.id],
  }),
}));

// ─── Invitations ──────────────────────────────────────────────────────────────

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
