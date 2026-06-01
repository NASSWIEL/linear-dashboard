import "server-only";

import type {
  CreateIssueInput,
  CreateProjectInput,
  Issue,
  Project,
  ProjectMembership,
  UpdateIssueInput,
  User,
  WorkflowStateOption,
} from "./types";

const LINEAR_URL = "https://api.linear.app/graphql";

function teamKey(): string {
  return process.env.LINEAR_TEAM_KEY ?? "REC";
}

interface GraphQLError {
  message: string;
}

async function linearQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LINEAR_API_KEY is not set. Create a Linear Personal API key (Settings -> API) and add it to .env.local.",
    );
  }

  const res = await fetch(LINEAR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Personal API keys use the raw key with no "Bearer" prefix.
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Linear API responded ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as { data?: T; errors?: GraphQLError[] };
  if (json.errors?.length) {
    throw new Error(
      `Linear GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }
  if (!json.data) {
    throw new Error("Linear GraphQL returned no data.");
  }
  return json.data;
}

const ISSUES_QUERY = /* GraphQL */ `
  query DashboardIssues($teamKey: String!, $first: Int!, $after: String) {
    issues(
      first: $first
      after: $after
      filter: { team: { key: { eq: $teamKey } } }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        description
        priority
        priorityLabel
        dueDate
        updatedAt
        url
        completedAt
        canceledAt
        state {
          name
          type
          color
        }
        assignee {
          id
          name
          displayName
          avatarUrl
        }
        project {
          id
          name
        }
        labels {
          nodes {
            name
            color
          }
        }
      }
    }
  }
`;

interface RawIssue extends Omit<Issue, "labels"> {
  labels: { nodes: { name: string; color: string }[] };
}

interface IssuesPage {
  issues: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: RawIssue[];
  };
}

function mapIssue(raw: RawIssue): Issue {
  return {
    ...raw,
    labels: raw.labels?.nodes ?? [],
  };
}

export async function fetchAllIssues(): Promise<Issue[]> {
  const all: Issue[] = [];
  let after: string | null = null;

  // Linear caps a single page at 250 nodes; paginate to be safe.
  do {
    const data: IssuesPage = await linearQuery<IssuesPage>(ISSUES_QUERY, {
      teamKey: teamKey(),
      first: 250,
      after,
    });
    all.push(...data.issues.nodes.map(mapIssue));
    after = data.issues.pageInfo.hasNextPage
      ? data.issues.pageInfo.endCursor
      : null;
  } while (after);

  // Newest activity first.
  all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return all;
}

const PROJECTS_QUERY = /* GraphQL */ `
  query DashboardProjects($first: Int!) {
    projects(first: $first) {
      nodes {
        id
        name
        color
        state
      }
    }
  }
`;

interface ProjectsPage {
  projects: { nodes: Project[] };
}

export async function fetchProjects(): Promise<Project[]> {
  const data = await linearQuery<ProjectsPage>(PROJECTS_QUERY, { first: 250 });
  return [...data.projects.nodes].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Write layer (mutations) + dropdown metadata (users, workflow states)
// ---------------------------------------------------------------------------

// Shared issue selection so mutations return the same shape mapIssue expects.
const ISSUE_FIELDS = /* GraphQL */ `
  id
  identifier
  title
  description
  priority
  priorityLabel
  dueDate
  updatedAt
  url
  completedAt
  canceledAt
  state { name type color }
  assignee { id name displayName avatarUrl }
  project { id name }
  labels { nodes { name color } }
`;

let cachedTeamId: string | null = null;

async function getTeamId(): Promise<string> {
  if (cachedTeamId) return cachedTeamId;
  const data = await linearQuery<{
    teams: { nodes: { id: string }[] };
  }>(
    `query TeamId($key:String!){ teams(filter:{ key:{ eq:$key } }){ nodes { id } } }`,
    { key: teamKey() },
  );
  const id = data.teams.nodes[0]?.id;
  if (!id) throw new Error(`Team ${teamKey()} not found.`);
  cachedTeamId = id;
  return id;
}

export async function fetchUsers(): Promise<User[]> {
  const data = await linearQuery<{
    users: {
      nodes: {
        id: string;
        name: string;
        displayName: string;
        avatarUrl: string | null;
        active: boolean;
        email: string;
      }[];
    };
  }>(
    `query Users($first:Int!){ users(first:$first){ nodes { id name displayName avatarUrl active email } } }`,
    { first: 250 },
  );
  return data.users.nodes
    // Exclude inactive users and the Linear app/bot (not assignable here).
    .filter((u) => u.active && !u.email.endsWith("@linear.linear.app"))
    .map((u) => ({
      id: u.id,
      name: u.name,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function fetchStates(): Promise<WorkflowStateOption[]> {
  const data = await linearQuery<{
    teams: {
      nodes: {
        states: { nodes: WorkflowStateOption[] };
      }[];
    };
  }>(
    `query States($key:String!){
      teams(filter:{ key:{ eq:$key } }){
        nodes { states { nodes { id name type color position } } }
      }
    }`,
    { key: teamKey() },
  );
  const states = data.teams.nodes[0]?.states.nodes ?? [];
  return [...states].sort((a, b) => a.position - b.position);
}

export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  const teamId = await getTeamId();
  const data = await linearQuery<{
    issueCreate: { success: boolean; issue: RawIssue };
  }>(
    `mutation Create($input: IssueCreateInput!){
      issueCreate(input:$input){ success issue { ${ISSUE_FIELDS} } }
    }`,
    {
      input: {
        teamId,
        title: input.title,
        description: input.description,
        projectId: input.projectId || undefined,
        stateId: input.stateId || undefined,
        assigneeId: input.assigneeId || undefined,
        priority: input.priority,
        dueDate: input.dueDate || undefined,
      },
    },
  );
  if (!data.issueCreate.success) throw new Error("Linear issueCreate failed.");
  return mapIssue(data.issueCreate.issue);
}

export async function updateIssue(
  id: string,
  input: UpdateIssueInput,
): Promise<Issue> {
  // Build the update payload, allowing explicit null to unassign / clear due date.
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.stateId !== undefined) payload.stateId = input.stateId;
  if (input.assigneeId !== undefined) payload.assigneeId = input.assigneeId;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.dueDate !== undefined) payload.dueDate = input.dueDate;

  const data = await linearQuery<{
    issueUpdate: { success: boolean; issue: RawIssue };
  }>(
    `mutation Update($id:String!, $input: IssueUpdateInput!){
      issueUpdate(id:$id, input:$input){ success issue { ${ISSUE_FIELDS} } }
    }`,
    { id, input: payload },
  );
  if (!data.issueUpdate.success) throw new Error("Linear issueUpdate failed.");
  return mapIssue(data.issueUpdate.issue);
}

export async function archiveIssue(id: string): Promise<boolean> {
  const data = await linearQuery<{ issueArchive: { success: boolean } }>(
    `mutation Archive($id:String!){ issueArchive(id:$id){ success } }`,
    { id },
  );
  return data.issueArchive.success;
}

// --- Project CRUD ----------------------------------------------------------

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const teamId = await getTeamId();
  const data = await linearQuery<{
    projectCreate: { success: boolean; project: Project };
  }>(
    `mutation CreateProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project { id name color state }
      }
    }`,
    {
      input: {
        name: input.name,
        description: input.description,
        color: input.color,
        teamIds: [teamId],
      },
    },
  );
  if (!data.projectCreate.success) throw new Error("Linear projectCreate failed.");
  return data.projectCreate.project;
}

export async function archiveProject(id: string): Promise<boolean> {
  const data = await linearQuery<{ projectArchive: { success: boolean } }>(
    `mutation ArchiveProject($id: String!) { projectArchive(id: $id) { success } }`,
    { id },
  );
  return data.projectArchive.success;
}

// --- Project members -------------------------------------------------------
// Linear has no add/remove member mutation; membership is the full memberIds
// array on projectUpdate. So we read the current set and write the change.

export async function fetchProjectMembership(
  projectId: string,
): Promise<ProjectMembership> {
  const data = await linearQuery<{
    project: {
      lead: { id: string } | null;
      members: {
        nodes: {
          id: string;
          name: string;
          displayName: string;
          avatarUrl: string | null;
        }[];
      };
    };
  }>(
    `query ProjMembers($id:String!){
      project(id:$id){
        lead { id }
        members { nodes { id name displayName avatarUrl } }
      }
    }`,
    { id: projectId },
  );
  return {
    leadId: data.project.lead?.id ?? null,
    members: data.project.members.nodes.map((u) => ({
      id: u.id,
      name: u.name,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl ?? null,
    })),
  };
}

async function currentMemberIds(projectId: string): Promise<string[]> {
  const { members } = await fetchProjectMembership(projectId);
  return members.map((m) => m.id);
}

async function setProjectMembers(
  projectId: string,
  memberIds: string[],
): Promise<void> {
  const data = await linearQuery<{ projectUpdate: { success: boolean } }>(
    `mutation SetMembers($id:String!, $input: ProjectUpdateInput!){
      projectUpdate(id:$id, input:$input){ success }
    }`,
    { id: projectId, input: { memberIds } },
  );
  if (!data.projectUpdate.success) throw new Error("Linear projectUpdate failed.");
}

export async function addProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectMembership> {
  const ids = await currentMemberIds(projectId);
  if (!ids.includes(userId)) await setProjectMembers(projectId, [...ids, userId]);
  return fetchProjectMembership(projectId);
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectMembership> {
  const ids = await currentMemberIds(projectId);
  await setProjectMembers(
    projectId,
    ids.filter((i) => i !== userId),
  );
  return fetchProjectMembership(projectId);
}
