import "server-only";

import type { Issue, Project } from "./types";

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
