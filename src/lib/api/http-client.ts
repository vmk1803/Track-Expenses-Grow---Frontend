import { env } from "@/config/env";
import { refreshAccessToken } from "@/lib/api/auth-bridge";
import type {
  ApiErrorResponse,
  ApiIssue,
} from "@/features/auth/types/auth";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
  skipAuthRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, issues?: ApiIssue[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = Object.fromEntries(
      (issues ?? []).map((issue) => [issue.path, issue.message])
    );
  }
}

async function performRequest(
  path: string,
  init: RequestInit,
  token: string | undefined,
  headers: HeadersInit | undefined,
  body: unknown
) {
  return fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
}

async function readError(response: Response): Promise<ApiError> {
  const fallbackMessage = "Something went wrong.";
  let payload: ApiErrorResponse | null = null;

  try {
    payload = (await response.json()) as ApiErrorResponse;
  } catch {
    payload = null;
  }

  return new ApiError(
    response.status,
    payload?.message ?? fallbackMessage,
    payload?.issues
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, token, skipAuthRefresh, ...rest } = options;

  let response = await performRequest(path, rest, token, headers, body);

  if (response.status === 401 && token && !skipAuthRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await performRequest(
        path,
        rest,
        refreshed.accessToken,
        headers,
        body
      );
    }
  }

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
