/**
 * API client for diary entries.
 */

export interface DiaryEntry {
  id: string;
  textContent?: string;
  createdAt: string;
  updatedAt: string;
  media: Array<{
    objectKey: string;
    url: string;
  }>;
}

export interface EntriesResponse {
  entries: DiaryEntry[];
  nextCursor?: string;
}

export async function getEntries(
  token: string,
  cursor?: string,
  limit = 20
): Promise<EntriesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  const res = await fetch(`/api/entries?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch entries");
  }

  return res.json();
}

export async function getEntry(
  id: string,
  token: string
): Promise<DiaryEntry> {
  const res = await fetch(`/api/entries/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch entry");
  }

  return res.json();
}

export async function createEntry(
  token: string,
  data: { textContent?: string; mediaUrls: string[] }
): Promise<{ id: string }> {
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create entry");
  }

  return res.json();
}

export async function deleteEntry(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/entries/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delete entry");
  }
}