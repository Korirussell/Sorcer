export type ForecastIntensity = "high" | "optimal" | "medium" | string;

export type ForecastPoint = {
  hour: string;
  intensity: ForecastIntensity;
};

export type ForecastResponse = {
  current_best_model: string;
  reason: string;
  forecast: ForecastPoint[];
};

export type OracleRequest = {
  prompt: string;
  urgency_level?: string;
};

export type OracleResponse = {
  model_id: string;
  reason?: string;
};

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (!base) {
    return "";
  }

  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getForecast(init?: RequestInit): Promise<ForecastResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/forecast`, {
    ...init,
    method: "GET",
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  return parseJsonResponse<ForecastResponse>(response);
}

export async function postOracleRoute(
  body: OracleRequest,
  init?: RequestInit
): Promise<OracleResponse> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/oracle/route`, {
    ...init,
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse<unknown>(response);

  if (
    typeof data === "object" &&
    data !== null &&
    "model_id" in data &&
    typeof (data as { model_id?: unknown }).model_id === "string"
  ) {
    return data as OracleResponse;
  }

  throw new Error("Oracle response missing model_id");
}
