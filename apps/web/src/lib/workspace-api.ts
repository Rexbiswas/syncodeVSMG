import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  TransferOwnershipInput,
  ChangeMemberRoleInput,
  CreateInvitationInput,
  CreateRoomInput,
  UpdateRoomInput,
  WorkspaceItem,
  WorkspaceDetail,
  WorkspaceMemberItem,
  WorkspaceInvitationItem,
  RoomItem,
} from '@syncode/validation';
import { authApi, type ApiResponse } from './auth-api';

export interface InvitationPreview {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  invitedBy: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

export interface SendInvitationResponse extends WorkspaceInvitationItem {
  invitationUrl?: string;
}

class WorkspaceApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = authApi.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${res.status}`,
            message: json?.message || res.statusText || 'Request failed',
          },
        };
      }

      return json as ApiResponse<T>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Unable to connect to server: ${msg}`,
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Workspaces
  // ---------------------------------------------------------------------------

  async createWorkspace(data: CreateWorkspaceInput): Promise<ApiResponse<WorkspaceDetail>> {
    return this.request<WorkspaceDetail>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listWorkspaces(): Promise<ApiResponse<WorkspaceItem[]>> {
    return this.request<WorkspaceItem[]>('/workspaces', {
      method: 'GET',
    });
  }

  async getWorkspace(id: string): Promise<ApiResponse<WorkspaceDetail>> {
    return this.request<WorkspaceDetail>(`/workspaces/${id}`, {
      method: 'GET',
    });
  }

  async updateWorkspace(
    id: string,
    data: UpdateWorkspaceInput,
  ): Promise<ApiResponse<WorkspaceDetail>> {
    return this.request<WorkspaceDetail>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  }

  async transferOwnership(
    id: string,
    data: TransferOwnershipInput,
  ): Promise<ApiResponse<WorkspaceDetail>> {
    return this.request<WorkspaceDetail>(`/workspaces/${id}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ---------------------------------------------------------------------------
  // Memberships
  // ---------------------------------------------------------------------------

  async listMembers(workspaceId: string): Promise<ApiResponse<WorkspaceMemberItem[]>> {
    return this.request<WorkspaceMemberItem[]>(`/workspaces/${workspaceId}/members`, {
      method: 'GET',
    });
  }

  async getMember(workspaceId: string, userId: string): Promise<ApiResponse<WorkspaceMemberItem>> {
    return this.request<WorkspaceMemberItem>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'GET',
    });
  }

  async changeMemberRole(
    workspaceId: string,
    userId: string,
    data: ChangeMemberRoleInput,
  ): Promise<ApiResponse<WorkspaceMemberItem>> {
    return this.request<WorkspaceMemberItem>(`/workspaces/${workspaceId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(
      `/workspaces/${workspaceId}/members/${userId}`,
      { method: 'DELETE' },
    );
  }

  async leaveWorkspace(workspaceId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/workspaces/${workspaceId}/leave`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // ---------------------------------------------------------------------------
  // Invitations
  // ---------------------------------------------------------------------------

  async sendInvitation(
    workspaceId: string,
    data: CreateInvitationInput,
  ): Promise<ApiResponse<SendInvitationResponse>> {
    return this.request<SendInvitationResponse>(`/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listInvitations(workspaceId: string): Promise<ApiResponse<WorkspaceInvitationItem[]>> {
    return this.request<WorkspaceInvitationItem[]>(`/workspaces/${workspaceId}/invitations`, {
      method: 'GET',
    });
  }

  async revokeInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}/revoke`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  }

  async resendInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<ApiResponse<SendInvitationResponse>> {
    return this.request<SendInvitationResponse>(
      `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  }

  async getInvitationPreview(token: string): Promise<ApiResponse<InvitationPreview>> {
    return this.request<InvitationPreview>(`/invitations/${token}/preview`, {
      method: 'GET',
    });
  }

  async acceptInvitation(
    token: string,
  ): Promise<ApiResponse<{ success: boolean; workspaceId: string; message: string }>> {
    return this.request<{ success: boolean; workspaceId: string; message: string }>(
      `/invitations/${token}/accept`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  }

  // ---------------------------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------------------------

  async createRoom(workspaceId: string, data: CreateRoomInput): Promise<ApiResponse<RoomItem>> {
    return this.request<RoomItem>(`/workspaces/${workspaceId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listRooms(workspaceId: string): Promise<ApiResponse<RoomItem[]>> {
    return this.request<RoomItem[]>(`/workspaces/${workspaceId}/rooms`, {
      method: 'GET',
    });
  }

  async getRoom(workspaceId: string, roomId: string): Promise<ApiResponse<RoomItem>> {
    return this.request<RoomItem>(`/workspaces/${workspaceId}/rooms/${roomId}`, {
      method: 'GET',
    });
  }

  async updateRoom(
    workspaceId: string,
    roomId: string,
    data: UpdateRoomInput,
  ): Promise<ApiResponse<RoomItem>> {
    return this.request<RoomItem>(`/workspaces/${workspaceId}/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRoom(
    workspaceId: string,
    roomId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(
      `/workspaces/${workspaceId}/rooms/${roomId}`,
      { method: 'DELETE' },
    );
  }
}

export const workspaceApi = new WorkspaceApiClient();
