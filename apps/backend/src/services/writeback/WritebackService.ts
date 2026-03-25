import { db } from '../../db/index.js';
import { analyses, userStories, sourceConnections, writebackHistory } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../../utils/encryption.js';
import { JiraConnector } from '../connectors/JiraConnector.js';
import { ADOConnector } from '../connectors/ADOConnector.js';

export interface WritebackFields {
  description?: boolean;
  acceptanceCriteria?: boolean;
}

export interface WritebackResult {
  id: string;
  sourceType: string;
  contentBefore: string;
  contentAfter: string;
  createdAt: Date;
}

export class WritebackService {
  async writeback(
    analysisId: string,
    teamId: string,
    pushedBy: string,
    fields: WritebackFields = { description: true, acceptanceCriteria: true },
  ): Promise<WritebackResult> {
    // Load analysis
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    if (!analysis || analysis.teamId !== teamId) throw new Error('Analysis not found');
    if (!analysis.improvedVersion) throw new Error('No improved version available for this analysis');
    if (!analysis.userStoryId) throw new Error('Analysis has no associated user story');

    // Load user story + connection
    const [story] = await db
      .select()
      .from(userStories)
      .where(eq(userStories.id, analysis.userStoryId))
      .limit(1);

    if (!story || !story.connectionId) throw new Error('User story or connection not found');

    const [connection] = await db
      .select()
      .from(sourceConnections)
      .where(eq(sourceConnections.id, story.connectionId))
      .limit(1);

    if (!connection) throw new Error('Source connection not found');

    const contentBefore = [story.description, story.acceptanceCriteria].filter(Boolean).join('\n\n---\n\n');
    const contentAfter = analysis.improvedVersion;

    const updateFields: { description?: string; acceptanceCriteria?: string } = {};
    if (fields.description) updateFields.description = analysis.improvedVersion;
    if (fields.acceptanceCriteria && story.acceptanceCriteria) {
      updateFields.acceptanceCriteria = analysis.improvedVersion;
    }

    const credentials = JSON.parse(decrypt(connection.encryptedCredentials)) as Record<string, string>;

    if (connection.type === 'jira') {
      const connector = new JiraConnector({
        baseUrl: connection.baseUrl,
        email: credentials['email']!,
        apiToken: credentials['apiToken']!,
        projectKey: connection.projectKey,
      });
      await connector.updateStory(story.externalId, updateFields);
    } else if (connection.type === 'azure_devops') {
      const connector = new ADOConnector({
        organizationUrl: connection.baseUrl,
        project: connection.projectKey,
        pat: credentials['pat']!,
      });
      await connector.updateWorkItem(parseInt(story.externalId, 10), updateFields);
    } else {
      throw new Error(`Unsupported source type: ${connection.type}`);
    }

    // Record in history
    const [record] = await db
      .insert(writebackHistory)
      .values({
        analysisId,
        userStoryId: story.id,
        teamId,
        contentBefore,
        contentAfter,
        sourceType: connection.type,
        pushedBy,
      })
      .returning();

    return record as WritebackResult;
  }
}
