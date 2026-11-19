'use client';

import React, { useEffect, useState, useRef, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { workspaceApi } from '@/lib/workspace-api';
import {
  CollaborationClient,
  type ConnectionStatus,
  type CollaborationParticipant,
} from '@/lib/collaboration-client';
import type { RoomItem, WorkspaceDetail } from '@syncode/validation';
import {
  CollaborationErrorCode,
  type CollaborationRoomInfoPayload,
  type CollaborationErrorPayload,
} from '@syncode/protocol';
import {
  ChevronRight,
  Lock,
  Globe,
  User,
  Calendar,
  Terminal,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Loader2,
  Users,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  WifiOff,
  Eye,
} from 'lucide-react';

function RoomDetailContent({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;
  const roomId = resolvedParams.roomId;

  const { accessToken, user } = useAuth();

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time Collaboration States
  const [collabStatus, setCollabStatus] = useState<ConnectionStatus>('CONNECTING');
  const [participants, setParticipants] = useState<CollaborationParticipant[]>([]);
  const [roomInfo, setRoomInfo] = useState<CollaborationRoomInfoPayload | null>(null);
  const [collabError, setCollabError] = useState<CollaborationErrorPayload | null>(null);
  const [codeContent, setCodeContent] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const clientRef = useRef<CollaborationClient | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.getRoom(workspaceId, roomId),
    ])
      .then(([wsRes, roomRes]) => {
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (roomRes.success && roomRes.data) {
          setRoom(roomRes.data);
        } else {
          setError(roomRes.error?.message || 'Failed to load room');
        }
      })
      .catch(() => {
        setError('An error occurred while loading room data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [workspaceId, roomId]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      workspaceApi.getWorkspace(workspaceId),
      workspaceApi.getRoom(workspaceId, roomId),
    ])
      .then(([wsRes, roomRes]) => {
        if (!isMounted) return;
        if (wsRes.success && wsRes.data) {
          setWorkspace(wsRes.data);
        } else {
          setError(wsRes.error?.message || 'Failed to load workspace');
        }

        if (roomRes.success && roomRes.data) {
          setRoom(roomRes.data);
        } else {
          setError(roomRes.error?.message || 'Failed to load room');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('An error occurred while loading room data');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, roomId]);

  // Connect to Collaboration Engine when Room & Token are ready
  useEffect(() => {
    if (!room || !accessToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || 'ws://localhost:4001/collaboration';

    const client = new CollaborationClient({
      wsUrl,
      token: accessToken,
      roomId: room.id,
      documentKey: 'main.ts',
      onStatusChange: (status) => {
        setCollabStatus(status);
      },
      onParticipantsChange: (updatedParticipants) => {
        setParticipants(updatedParticipants);
      },
      onRoomInfo: (info) => {
        setRoomInfo(info);
      },
      onError: (err) => {
        setCollabError(err);
      },
      onDocChange: (newContent) => {
        setCodeContent(newContent);
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, [room, accessToken]);

  // Handle user typing into the collaborative text area
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (roomInfo?.isReadOnly) {
      setCollabError({
        code: CollaborationErrorCode.READ_ONLY_VIOLATION,
        message: 'You have Viewer permissions and cannot modify this document.',
        fatal: false,
      });
      return;
    }

    const newText = e.target.value;
    setCodeContent(newText);
    if (clientRef.current) {
      clientRef.current.setContent(newText);
    }
  };

  // Track cursor position in awareness
  const handleSelectionChange = () => {
    if (!textareaRef.current || !clientRef.current) return;
    const pos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = textareaRef.current.value.substring(0, pos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    setCursorPos({ line, column });
    clientRef.current.updateCursor(line, column);
  };

  const copyRoomLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleReconnect = () => {
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current.connect();
    }
  };

  const loadSampleCode = () => {
    if (roomInfo?.isReadOnly) return;
    const sample = `// SYNCODE Real-Time Collaboration Session
// Document: main.ts
// Engine: Yjs CRDT + Binary WebSockets

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  
  await app.listen(4000);
  console.log('SYNCODE API Gateway active on http://localhost:4000');
}

bootstrap();
`;
    if (clientRef.current) {
      clientRef.current.setContent(sample);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/dashboard"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <Link
            href={`/workspaces/${workspaceId}`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors truncate max-w-xs"
          >
            {workspace?.name || 'Workspace'}
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <Link
            href={`/workspaces/${workspaceId}/rooms`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Rooms
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">
            {room?.name || 'Room'}
          </span>
        </nav>

        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
            <div className="h-96 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded mt-6" />
          </div>
        ) : error || !room ? (
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
          <div className="space-y-6">
            {/* Room Info Header */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {room.name}
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    #{room.slug}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
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
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Created by @{room.createdBy.username}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons & Status Badge */}
              <div className="flex items-center gap-3">
                <button
                  onClick={copyRoomLink}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied' : 'Share Room'}</span>
                </button>

                <Link
                  href={`/workspaces/${workspaceId}/rooms`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Rooms</span>
                </Link>
              </div>
            </div>

            {/* Read-Only Warning Banner */}
            {roomInfo?.isReadOnly && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>View-Only Room Access:</strong> You are signed in as a Viewer. You can observe live collaborative code changes, but editing is disabled.
                  </span>
                </div>
              </div>
            )}

            {/* Error Notification Banner */}
            {collabError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{collabError.message}</span>
                </div>
                <button
                  onClick={() => setCollabError(null)}
                  className="text-red-400 hover:text-red-300 font-bold ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Phase 4 Live Collaboration Engine Surface */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left / Main Column: Collaborative Code Workspace */}
              <div className="lg:col-span-3 space-y-4">
                <div className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl overflow-hidden flex flex-col">
                  {/* Editor Header Bar */}
                  <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                        <FileCode className="w-3.5 h-3.5 text-purple-400" />
                        <span>main.ts</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                        CRDT Document Key: main.ts
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Connection Status Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-zinc-900">
                        {collabStatus === 'CONNECTED' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-emerald-400">Live Sync</span>
                          </>
                        ) : collabStatus === 'CONNECTING' || collabStatus === 'RECONNECTING' ? (
                          <>
                            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                            <span className="text-amber-400">{collabStatus}</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">{collabStatus}</span>
                          </>
                        )}
                      </div>

                      {/* Reconnect button if disconnected */}
                      {collabStatus !== 'CONNECTED' && (
                        <button
                          onClick={handleReconnect}
                          className="p-1 text-zinc-400 hover:text-white"
                          title="Reconnect to room"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collaborative Text Editing Area */}
                  <div className="relative min-h-[420px] bg-[#0c0d12] flex">
                    {/* Line numbers gutter */}
                    <div className="w-12 py-4 select-none bg-zinc-950/60 border-r border-zinc-900 text-zinc-600 font-mono text-xs text-right pr-3 space-y-1">
                      {Array.from({ length: Math.max(codeContent.split('\n').length, 18) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Editor Surface */}
                    <textarea
                      ref={textareaRef}
                      value={codeContent}
                      onChange={handleTextChange}
                      onSelect={handleSelectionChange}
                      onKeyUp={handleSelectionChange}
                      onClick={handleSelectionChange}
                      readOnly={roomInfo?.isReadOnly}
                      placeholder={
                        roomInfo?.isReadOnly
                          ? 'Document is currently empty. Awaiting updates from room editors...'
                          : '// Start collaborating in real-time... (Type code or insert samples below)'
                      }
                      spellCheck={false}
                      className="flex-1 p-4 bg-transparent text-zinc-100 font-mono text-xs leading-relaxed focus:outline-none resize-none min-h-[420px] placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Editor Footer Status Bar */}
                  <div className="px-4 py-2 bg-zinc-900/90 border-t border-zinc-800 text-[11px] font-mono text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
                      <span>{codeContent.length} chars</span>
                      <span>{codeContent.split('\n').length} lines</span>
                    </div>

                    <div className="flex items-center gap-4">
                      {!roomInfo?.isReadOnly && (
                        <button
                          onClick={loadSampleCode}
                          className="hover:text-purple-400 transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Load NestJS Sample</span>
                        </button>
                      )}
                      <span className="text-zinc-600">|</span>
                      <span>Yjs CRDT v13</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Participants & Room Metadata */}
              <div className="space-y-4">
                {/* Active Collaborators Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span>In This Room ({participants.length || 1})</span>
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    {/* Current User */}
                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
                          style={{ backgroundColor: roomInfo?.userColor || '#6366f1' }}
                        >
                          {(user?.username || 'You')[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {user?.displayName || user?.username || 'You'} <span className="text-zinc-400 text-[10px]">(You)</span>
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate font-mono">
                            @{user?.username}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {roomInfo?.role || workspace?.currentUserRole || 'MEMBER'}
                      </span>
                    </div>

                    {/* Remote Participants */}
                    {participants
                      .filter((p) => p.id !== user?.id)
                      .map((p) => (
                        <div
                          key={p.clientId}
                          className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/40 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
                              style={{ backgroundColor: p.color }}
                            >
                              {p.username[0].toUpperCase()}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {p.displayName || p.username}
                              </p>
                              <p className="text-[10px] text-zinc-400 truncate font-mono">
                                @{p.username}
                                {p.cursor && ` • Ln ${p.cursor.line}, Col ${p.cursor.column}`}
                              </p>
                            </div>
                          </div>

                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            {p.role}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Session Architecture Specs */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-[11px] space-y-2">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold border-b border-zinc-800 pb-1.5">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" />
                    <span>Real-Time Engine</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Transport:</span>
                    <span className="text-zinc-300">Binary WebSocket</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">CRDT:</span>
                    <span className="text-emerald-400">Yjs State Vectors</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Persistence:</span>
                    <span className="text-zinc-300">PostgreSQL Bytea</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Cluster Sync:</span>
                    <span className="text-zinc-300">Redis Pub/Sub</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Awareness:</span>
                    <span className="text-purple-400">Yjs Presence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <RoomDetailContent params={params} />
    </Suspense>
  );
}
