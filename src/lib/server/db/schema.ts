import { relations } from 'drizzle-orm';
import {
	boolean,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date())
};

export const workspace = pgTable('workspace', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	...timestamps
});

export const workspaceMember = pgTable(
	'workspace_member',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => workspace.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role').$type<WorkspaceRole>().notNull().default('member'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('workspace_member_workspace_user_unique').on(table.workspaceId, table.userId),
		index('workspace_member_user_idx').on(table.userId)
	]
);

export const project = pgTable(
	'project',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => workspace.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		color: text('color').notNull().default('#6366f1'),
		archived: boolean('archived').notNull().default(false),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [
		index('project_workspace_idx').on(table.workspaceId),
		index('project_archived_idx').on(table.archived)
	]
);

export const boardColumn = pgTable(
	'board_column',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		position: integer('position').notNull().default(0),
		isDone: boolean('is_done').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('board_column_project_idx').on(table.projectId)]
);

export const task = pgTable(
	'task',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		columnId: text('column_id')
			.notNull()
			.references(() => boardColumn.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		priority: text('priority').$type<TaskPriority>().notNull().default('medium'),
		assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
		dueDate: date('due_date'),
		position: integer('position').notNull().default(0),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [
		index('task_project_idx').on(table.projectId),
		index('task_column_idx').on(table.columnId),
		index('task_assignee_idx').on(table.assigneeId),
		index('task_due_date_idx').on(table.dueDate)
	]
);

export const document = pgTable(
	'document',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		mimeType: text('mime_type').notNull().default('application/octet-stream'),
		size: integer('size').notNull().default(0),
		storageKey: text('storage_key').notNull(),
		uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('document_project_idx').on(table.projectId)]
);

export const linkNote = pgTable(
	'link_note',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		title: text('title').notNull(),
		description: text('description'),
		tags: text('tags').array().notNull().default([]),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [index('link_note_project_idx').on(table.projectId)]
);

export const workspaceRelations = relations(workspace, ({ many }) => ({
	members: many(workspaceMember),
	projects: many(project)
}));

export const workspaceMemberRelations = relations(workspaceMember, ({ one }) => ({
	workspace: one(workspace, {
		fields: [workspaceMember.workspaceId],
		references: [workspace.id]
	}),
	user: one(user, {
		fields: [workspaceMember.userId],
		references: [user.id]
	})
}));

export const projectRelations = relations(project, ({ one, many }) => ({
	workspace: one(workspace, {
		fields: [project.workspaceId],
		references: [workspace.id]
	}),
	columns: many(boardColumn),
	tasks: many(task),
	documents: many(document),
	links: many(linkNote)
}));

export const boardColumnRelations = relations(boardColumn, ({ one, many }) => ({
	project: one(project, {
		fields: [boardColumn.projectId],
		references: [project.id]
	}),
	tasks: many(task)
}));

export const taskRelations = relations(task, ({ one }) => ({
	project: one(project, {
		fields: [task.projectId],
		references: [project.id]
	}),
	column: one(boardColumn, {
		fields: [task.columnId],
		references: [boardColumn.id]
	})
}));

export const documentRelations = relations(document, ({ one }) => ({
	project: one(project, {
		fields: [document.projectId],
		references: [project.id]
	})
}));

export const linkNoteRelations = relations(linkNote, ({ one }) => ({
	project: one(project, {
		fields: [linkNote.projectId],
		references: [project.id]
	})
}));

export * from './auth.schema';
