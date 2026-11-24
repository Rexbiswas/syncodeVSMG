'use client';

import React, { useEffect, useState, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { WorkspaceHeader } from '@/components/workspace-header';
import { workspaceApi } from '@/lib/workspace-api';
import { useAuth } from '@/context/auth-context';
import {
  RoomVisibility,
  WorkspaceRole,
  type WorkspaceDetail,
  type RoomItem,
} from '@syncode/validation';
import {
  Layers,
  Plus,
  Lock,
  Globe,
  Trash2,
  Edit2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

function WorkspaceRoomsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = useAuth();
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Create room modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomSlug, setRoomSlug] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [roomDescription, setRoomDescription] = useState('');
  const [roomVisibility, setRoomVisibility] = useState<RoomVisibility>(RoomVisibility.PRIVATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit room modal
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<RoomVisibility>(RoomVisibility.PRIVATE);
  const [isEditing, setIsEditing] = useState(false);

  // Action status
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wsRes, roomsRes] = await Promise.all([
        workspaceApi.getWorkspace(workspaceId),
        workspaceApi.listRooms(workspaceId),
      ]);

      if (wsRes.success && wsRes.data) {
        setWorkspace(wsRes.data);
      } else {
        setError(wsRes.error?.message || 'Failed to load workspace');
      }

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }
    } catch {
      setError('An error occurred while loading rooms');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.listRooms(workspaceId),
    ])
      .then(([wsRes, roomsRes]) => {
        if (!isMounted) return;
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (roomsRes.success && roomsRes.data) {
          setRooms(roomsRes.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading rooms');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleNameChange = (val: string) => {
    setRoomName(val);
    if (!isSlugManual) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setRoomSlug(generated);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (roomName.trim().length < 2) {
      setFormError('Room name must be at least 2 characters');
      return;
    }

    if (roomSlug.trim().length < 2) {
      setFormError('Room slug must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await workspaceApi.createRoom(workspaceId, {
        name: roomName.trim(),
        slug: roomSlug.trim(),
        description: roomDescription.trim() ? roomDescription.trim() : null,
        visibility: roomVisibility,
      });

      if (res.success && res.data) {
        setRooms((prev) => [res.data!, ...prev]);
        setIsCreateModalOpen(false);
        setRoomName('');
        setRoomSlug('');
        setIsSlugManual(false);
        setRoomDescription('');
        setActionSuccess(`Room "${res.data.name}" created successfully`);
      } else {
        setFormError(res.error?.message || 'Failed to create room');
      }
    } catch {
      setFormError('An error occurred while creating room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (room: RoomItem) => {
    setEditingRoom(room);
    setEditName(room.name);
    setEditDescription(room.description || '');
    setEditVisibility(room.visibility);
    setFormError(null);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setIsEditing(true);
    setFormError(null);
    try {
      const res = await workspaceApi.updateRoom(workspaceId, editingRoom.id, {
        name: editName.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        visibility: editVisibility,
      });

      if (res.success && res.data) {
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? res.data! : r)),
        );
        setEditingRoom(null);
        setActionSuccess('Room updated successfully');
      } else {
        setFormError(res.error?.message || 'Failed to update room');
      }
    } catch {
      setFormError('An error occurred while updating room');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete room "${name}"?`)) {
      return;
    }

    try {
      const res = await workspaceApi.deleteRoom(workspaceId, roomId);
      if (res.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        setActionSuccess(`Room "${name}" deleted`);
      } else {
        setActionError(res.error?.message || 'Failed to delete room');
      }
    } catch {
      setActionError('An error occurred while deleting room');
    }
  };

  const isOwnerOrAdmin =
    workspace?.currentUserRole === WorkspaceRole.OWNER ||
    workspace?.currentUserRole === WorkspaceRole.ADMIN;

  const canCreateRoom = workspace?.currentUserRole !== WorkspaceRole.VIEWER;

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
          </div>
        ) : error || !workspace ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/60 text-center space-y-4">
            <div className="text-red-600 dark:text-red-400 font-semibold">{error}</div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
            <WorkspaceHeader workspace={workspace} />

            {/* Notifications */}
            {actionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {actionSuccess}
                </span>
                <button
                  onClick={() => setActionSuccess(null)}
                  className="text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}
            {actionError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {actionError}
                </span>
                <button
                  onClick={() => setActionError(null)}
                  className="text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Room Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter rooms by name or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>

              {canCreateRoom && (
                <button
                  onClick={() => {
                    setIsCreateModalOpen(true);
                    setFormError(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Room</span>
                </button>
              )}
            </div>

            {/* Rooms Grid */}
            {filteredRooms.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 space-y-4">
                <Layers className="w-8 h-8 mx-auto text-zinc-400" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {searchQuery ? 'No matching rooms' : 'No rooms created yet'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                    {searchQuery
                      ? 'Try adjusting your search query to find the room you are looking for.'
                      : 'Rooms are the collaboration spaces where developers edit code together in real-time.'}
                  </p>
                </div>
                {canCreateRoom && !searchQuery && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Room</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRooms.map((room) => {
                  const canManageRoom =
                    isOwnerOrAdmin ||
                    (workspace.currentUserRole === WorkspaceRole.MEMBER &&
                      room.createdById === user?.id);

                  return (
                    <div
                      key={room.id}
                      className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-all space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                              {room.name}
                            </h3>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                              #{room.slug}
                            </span>
                          </div>

                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                            {room.visibility === 'PUBLIC' ? (
                              <>
                                <Globe className="w-3 h-3 text-sky-500" /> Public
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-zinc-400" /> Private
                              </>
                            )}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[2rem]">
                          {room.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 truncate max-w-[120px]">
                          @{room.createdBy.username}
                        </span>

                        <div className="flex items-center gap-2">
                          {canManageRoom && (
                            <>
                              <button
                                onClick={() => openEditModal(room)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Edit Room"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRoom(room.id, room.name)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Delete Room"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <Link
                            href={`/workspaces/${workspace.id}/rooms/${room.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold transition-colors"
                          >
                            <span>Enter</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create Room Modal */}
            {isCreateModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      </div>
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                        Create New Room
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Room Name *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="e.g. Frontend Architecture"
                        value={roomName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Room Slug *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        placeholder="e.g. frontend-architecture"
                        value={roomSlug}
                        onChange={(e) => {
                          setIsSlugManual(true);
                          setRoomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        }}
                        className="w-full px-3 py-2 rounded-xl font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[10px] text-zinc-400">
                        Unique identifier for this room inside the workspace.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Description (Optional)
                      </label>
                      <textarea
                        rows={2}
                        maxLength={300}
                        placeholder="What code or topic is being discussed?"
                        value={roomDescription}
                        onChange={(e) => setRoomDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Room Visibility
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRoomVisibility(RoomVisibility.PRIVATE)}
                          className={`p-3 rounded-xl border text-left text-xs ${roomVisibility === RoomVisibility.PRIVATE
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                            : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                          <div className="font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                            <Lock className="w-3.5 h-3.5" /> Private
                          </div>
                          <div className="text-[10px] text-zinc-500">Only workspace members</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRoomVisibility(RoomVisibility.PUBLIC)}
                          className={`p-3 rounded-xl border text-left text-xs ${roomVisibility === RoomVisibility.PUBLIC
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                            : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                          <div className="font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                            <Globe className="w-3.5 h-3.5 text-sky-500" /> Public
                          </div>
                          <div className="text-[10px] text-zinc-500">Accessible across team</div>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !roomName.trim() || !roomSlug.trim()}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Create Room</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Room Modal */}
            {editingRoom && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                      Edit Room #{editingRoom.slug}
                    </h3>
                    <button
                      onClick={() => setEditingRoom(null)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateRoom} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Room Name *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        maxLength={300}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Visibility
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEditVisibility(RoomVisibility.PRIVATE)}
                          className={`p-3 rounded-xl border text-left text-xs ${editVisibility === RoomVisibility.PRIVATE
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                            : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                          <div className="font-semibold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Private
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditVisibility(RoomVisibility.PUBLIC)}
                          className={`p-3 rounded-xl border text-left text-xs ${editVisibility === RoomVisibility.PUBLIC
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500'
                            : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                          <div className="font-semibold flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-sky-500" /> Public
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRoom(null)}
                        className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isEditing || !editName.trim()}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {isEditing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function WorkspaceRoomsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <WorkspaceRoomsContent params={params} />
    </Suspense>
  );
}
