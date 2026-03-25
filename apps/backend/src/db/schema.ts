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
// V2 additions use the same imports above
import { relations } from 'drizzle-orm';

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('trial'), // 'trial' | 'starter' | 'pro'
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  stripeCustomerId: text('stripe_customer_id'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }), // V2: null = active
  analyticsCoefficients: jsonb('analytics_coefficients'), // 006: { analysis, generation, manualTest } minutes
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
    ollamaEndpoint: text('ollama_endpoint'), // V2: URL du serveur Ollama local
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
  // V2 Xray — credentials optionnels, uniquement pour les connexions Jira
  xrayClientId: text('xray_client_id'),
  xrayClientSecret: text('xray_client_secret'), // chiffré AES-256-GCM
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
  manualTestSetId: uuid('manual_test_set_id'), // Feature 002: lien optionnel vers le lot de tests manuels
  // Feature 004: validation syntaxique
  validationStatus: text('validation_status').default('skipped'), // skipped | valid | auto_corrected | has_errors
  validationErrors: jsonb('validation_errors').default([]),
  correctionAttempts: integer('correction_attempts').default(0),
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

// ─── V2: Git Configs ──────────────────────────────────────────────────────────

export const gitConfigs = pgTable('git_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'github' | 'gitlab' | 'azure_repos'
  name: text('name').notNull(),
  repoUrl: text('repo_url').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  defaultBranch: text('default_branch').notNull().default('main'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gitConfigsRelations = relations(gitConfigs, ({ one, many }) => ({
  team: one(teams, { fields: [gitConfigs.teamId], references: [teams.id] }),
  pushes: many(gitPushes),
}));

// ─── V2: Git Pushes ───────────────────────────────────────────────────────────

export const gitPushes = pgTable('git_pushes', {
  id: uuid('id').primaryKey().defaultRandom(),
  generationId: uuid('generation_id')
    .notNull()
    .references(() => generations.id, { onDelete: 'cascade' }),
  gitConfigId: uuid('git_config_id').references(() => gitConfigs.id, { onDelete: 'set null' }),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  mode: text('mode').notNull(), // 'commit' | 'pr'
  branchName: text('branch_name').notNull(),
  commitSha: text('commit_sha'),
  prUrl: text('pr_url'),
  status: text('status').notNull().default('pending'), // 'pending' | 'success' | 'error'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gitPushesRelations = relations(gitPushes, ({ one }) => ({
  generation: one(generations, { fields: [gitPushes.generationId], references: [generations.id] }),
  gitConfig: one(gitConfigs, { fields: [gitPushes.gitConfigId], references: [gitConfigs.id] }),
  team: one(teams, { fields: [gitPushes.teamId], references: [teams.id] }),
}));

// ─── V2: Writeback History ────────────────────────────────────────────────────

export const writebackHistory = pgTable('writeback_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  userStoryId: uuid('user_story_id').references(() => userStories.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  contentBefore: text('content_before').notNull(),
  contentAfter: text('content_after').notNull(),
  sourceType: text('source_type').notNull(), // 'jira' | 'azure_devops'
  pushedBy: uuid('pushed_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const writebackHistoryRelations = relations(writebackHistory, ({ one }) => ({
  analysis: one(analyses, { fields: [writebackHistory.analysisId], references: [analyses.id] }),
  userStory: one(userStories, { fields: [writebackHistory.userStoryId], references: [userStories.id] }),
  team: one(teams, { fields: [writebackHistory.teamId], references: [teams.id] }),
}));

// ─── V2: Xray Configs ─────────────────────────────────────────────────────────

export const xrayConfigs = pgTable(
  'xray_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    projectKey: text('project_key').notNull(),
    encryptedCredentials: text('encrypted_credentials').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    oneXrayConfigPerTeam: uniqueIndex('one_xray_config_per_team').on(table.teamId),
  }),
);

export const xrayConfigsRelations = relations(xrayConfigs, ({ one }) => ({
  team: one(teams, { fields: [xrayConfigs.teamId], references: [teams.id] }),
}));

// ─── V2: Xray Tests ───────────────────────────────────────────────────────────

export const xrayTests = pgTable('xray_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  generationId: uuid('generation_id')
    .notNull()
    .references(() => generations.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  xrayTestId: text('xray_test_id').notNull(),
  xrayTestKey: text('xray_test_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const xrayTestsRelations = relations(xrayTests, ({ one }) => ({
  generation: one(generations, { fields: [xrayTests.generationId], references: [generations.id] }),
  team: one(teams, { fields: [xrayTests.teamId], references: [teams.id] }),
}));

// ─── V2: ADO Test Cases ───────────────────────────────────────────────────────

export const adoTestCases = pgTable('ado_test_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  generationId: uuid('generation_id')
    .notNull()
    .references(() => generations.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  testCaseId: integer('test_case_id').notNull(),
  testSuiteId: integer('test_suite_id'),
  testPlanId: integer('test_plan_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adoTestCasesRelations = relations(adoTestCases, ({ one }) => ({
  generation: one(generations, { fields: [adoTestCases.generationId], references: [generations.id] }),
  team: one(teams, { fields: [adoTestCases.teamId], references: [teams.id] }),
}));

// ─── V2: POM Templates ────────────────────────────────────────────────────────

export const pomTemplates = pgTable(
  'pom_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    framework: text('framework').notNull(),
    language: text('language').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    oneTemplatePerTeamFrameworkLanguage: uniqueIndex('one_pom_template_per_team_framework_language').on(
      table.teamId,
      table.framework,
      table.language,
    ),
  }),
);

export const pomTemplatesRelations = relations(pomTemplates, ({ one }) => ({
  team: one(teams, { fields: [pomTemplates.teamId], references: [teams.id] }),
}));

// ─── Feature 005: POM Registry ────────────────────────────────────────────────

export const pomRegistry = pgTable(
  'pom_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    className: text('class_name').notNull(),
    filename: text('filename').notNull(),
    methods: jsonb('methods').notNull().default([]),         // [{name, params, returnType, jsdoc}]
    fullContent: text('full_content').notNull(),
    sourceGenerationId: uuid('source_generation_id').references(() => generations.id, { onDelete: 'set null' }),
    sourceUserStoryId: uuid('source_user_story_id').references(() => userStories.id),
    framework: text('framework').notNull(),
    language: text('language').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueClassPerStack: uniqueIndex('pom_registry_unique_class').on(
      table.teamId, table.className, table.framework, table.language,
    ),
  }),
);

export const pomRegistryRelations = relations(pomRegistry, ({ one }) => ({
  team: one(teams, { fields: [pomRegistry.teamId], references: [teams.id] }),
  generation: one(generations, { fields: [pomRegistry.sourceGenerationId], references: [generations.id] }),
  userStory: one(userStories, { fields: [pomRegistry.sourceUserStoryId], references: [userStories.id] }),
}));

// ─── V2: Super Admins ─────────────────────────────────────────────────────────

export const superAdmins = pgTable('super_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Feature 002: Manual Test First ──────────────────────────────────────────

export const manualTestSets = pgTable('manual_test_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userStoryId: uuid('user_story_id').notNull().references(() => userStories.id),
  status: text('status').notNull().default('draft'),           // draft | validated | pushed
  usedImprovedVersion: boolean('used_improved_version').notNull().default(false),
  version: integer('version').notNull().default(1),
  excludedCriteria: jsonb('excluded_criteria').notNull().default([]),
  llmProvider: text('llm_provider').notNull(),
  llmModel: text('llm_model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  validatedBy: uuid('validated_by'),
  pushedAt: timestamp('pushed_at', { withTimezone: true }),
  pushTarget: text('push_target'),                             // xray | ado | null
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const manualTestSetsRelations = relations(manualTestSets, ({ one, many }) => ({
  analysis: one(analyses, { fields: [manualTestSets.analysisId], references: [analyses.id] }),
  team: one(teams, { fields: [manualTestSets.teamId], references: [teams.id] }),
  userStory: one(userStories, { fields: [manualTestSets.userStoryId], references: [userStories.id] }),
  testCases: many(manualTestCases),
}));

export const manualTestCases = pgTable('manual_test_cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  manualTestSetId: uuid('manual_test_set_id').notNull().references(() => manualTestSets.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  precondition: text('precondition'),
  priority: text('priority').notNull().default('medium'),      // critical | high | medium | low
  category: text('category').notNull().default('happy_path'),  // happy_path | error_case | edge_case | other
  steps: jsonb('steps').notNull().default([]),                 // [{stepNumber, action, expectedResult}]
  sortOrder: integer('sort_order').notNull().default(0),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  externalSource: text('external_source'),                     // xray | ado | null
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const manualTestCasesRelations = relations(manualTestCases, ({ one }) => ({
  testSet: one(manualTestSets, { fields: [manualTestCases.manualTestSetId], references: [manualTestSets.id] }),
  team: one(teams, { fields: [manualTestCases.teamId], references: [teams.id] }),
}));
