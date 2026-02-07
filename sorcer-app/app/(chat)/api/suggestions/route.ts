import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter documentId is required."
    ).toResponse();
  }

  // Public access - allow access to all suggestions
  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  if (suggestions.length === 0) {
    return Response.json([], { status: 200 });
  }

  return Response.json(suggestions, { status: 200 });
}
