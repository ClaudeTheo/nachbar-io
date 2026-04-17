// Typed fetch-Wrapper fuer Chat-API. Client-seitig, nutzt Cookie-Auth.

import type {
  ContactWithProfile,
  ContactStatus,
} from "@/modules/chat/services/contacts.service";
import type {
  ConversationWithPeer,
  Conversation,
} from "@/modules/chat/services/conversations.service";
import type {
  DirectMessage,
  SendMessageInput,
} from "@/modules/chat/services/messages.service";
import type {
  ChatGroup,
  ChatGroupMember,
  ChatGroupMessage,
  SendGroupMessageInput,
} from "@/modules/chat/services/chat-groups.service";
import type {
  SignedUploadResult,
  ChatMediaScope,
} from "@/modules/chat/services/media-upload.service";

export class ChatApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ChatApiError(
      response.status,
      data?.error ?? `HTTP ${response.status}`,
      data?.code,
    );
  }

  return data as T;
}

// ============================================================
// Contacts
// ============================================================

export function listContacts(status?: ContactStatus) {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<ContactWithProfile[]>(`/api/contacts${qs}`);
}

export function sendContactRequest(addressee_id: string, note?: string) {
  return apiFetch<{
    requester_id: string;
    addressee_id: string;
    status: ContactStatus;
  }>(`/api/contacts`, {
    method: "POST",
    body: JSON.stringify({ addressee_id, note }),
  });
}

export function updateContactStatus(peer_id: string, status: ContactStatus) {
  return apiFetch(`/api/contacts/${peer_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteContact(peer_id: string) {
  return apiFetch<void>(`/api/contacts/${peer_id}`, { method: "DELETE" });
}

// ============================================================
// Conversations (1:1)
// ============================================================

export function listConversations() {
  return apiFetch<ConversationWithPeer[]>(`/api/conversations`);
}

export function openConversation(peer_id: string) {
  return apiFetch<Conversation>(`/api/conversations`, {
    method: "POST",
    body: JSON.stringify({ peer_id }),
  });
}

export function listMessages(
  conversationId: string,
  options: { before?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.before) params.set("before", options.before);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  return apiFetch<DirectMessage[]>(
    `/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export function sendDirectMessage(
  conversationId: string,
  input: SendMessageInput,
) {
  return apiFetch<DirectMessage>(
    `/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function markConversationRead(conversationId: string) {
  return apiFetch<{ marked: number }>(
    `/api/conversations/${conversationId}/read`,
    { method: "POST" },
  );
}

// ============================================================
// Chat-Groups
// ============================================================

export function listMyGroups() {
  return apiFetch<ChatGroup[]>(`/api/chat-groups`);
}

export function createGroup(name: string, description?: string) {
  return apiFetch<ChatGroup>(`/api/chat-groups`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export function deleteGroup(groupId: string) {
  return apiFetch<void>(`/api/chat-groups/${groupId}`, { method: "DELETE" });
}

export function listGroupMembers(groupId: string) {
  return apiFetch<ChatGroupMember[]>(`/api/chat-groups/${groupId}/members`);
}

export function addGroupMember(
  groupId: string,
  user_id: string,
  role: "admin" | "member" = "member",
) {
  return apiFetch<ChatGroupMember>(`/api/chat-groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id, role }),
  });
}

export function removeGroupMember(groupId: string, user_id: string) {
  return apiFetch<void>(`/api/chat-groups/${groupId}/members/${user_id}`, {
    method: "DELETE",
  });
}

export function listGroupMessages(
  groupId: string,
  options: { before?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.before) params.set("before", options.before);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  return apiFetch<ChatGroupMessage[]>(
    `/api/chat-groups/${groupId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export function sendGroupMessage(
  groupId: string,
  input: SendGroupMessageInput,
) {
  return apiFetch<ChatGroupMessage>(`/api/chat-groups/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ============================================================
// Media-Upload
// ============================================================

export function requestSignedUploadUrl(
  scope: ChatMediaScope,
  owner_id: string,
  mime_type: string,
) {
  return apiFetch<SignedUploadResult>(`/api/chat-media/signed-url`, {
    method: "POST",
    body: JSON.stringify({ scope, owner_id, mime_type }),
  });
}

export async function uploadBlobToSignedUrl(
  signedUrl: string,
  blob: Blob,
  mimeType: string,
): Promise<void> {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!response.ok) {
    throw new ChatApiError(response.status, "Upload fehlgeschlagen");
  }
}
