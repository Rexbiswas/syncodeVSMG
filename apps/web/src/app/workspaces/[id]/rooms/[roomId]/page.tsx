'use client';

import React, { useEffect, useState, useRef, use, useCallback, Suspense } from 'react';
import Link from 'next/link';
import type * as monacoType from 'monaco-editor';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { workspaceApi } from '@/lib/workspace-api';
import {
  CollaborationClient,
  type ConnectionStatus,
  type CollaborationParticipant,
} from '@/lib/collaboration-client';
import type { RoomItem, WorkspaceDetail } from '@syncode/validation';
import type {
  CollaborationRoomInfoPayload,
  CollaborationErrorPayload,
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
  Copy,
  Check,
  AlertTriangle,
  WifiOff,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { MonacoCodeEditor } from '@/components/editor/monaco-code-editor';
import { EditorTabBar } from '@/components/editor/editor-tab-bar';
import { CollaboratorRoster } from '@/components/editor/collaborator-roster';
import { EditorSettingsDialog } from '@/components/editor/editor-settings-dialog';
import {
  type EditorSettings,
  loadEditorSettings,
  saveEditorSettings,
} from '@/lib/editor-settings';
import { DEFAULT_ROOM_TABS, type EditorTab } from '@/lib/editor-tabs';
import { getLanguageFromFilename } from '@/lib/editor-languages';

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

  // Tabs & File Buffers
  const [tabs, setTabs] = useState<EditorTab[]>(DEFAULT_ROOM_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(DEFAULT_ROOM_TABS[0].id);

  // Editor Settings & UI State
  const [settings, setSettings] = useState<EditorSettings>(() => loadEditorSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRosterOpen, setIsRosterOpen] = useState<boolean>(true);

  // Real-time Collaboration States
  const [collabStatus, setCollabStatus] = useState<ConnectionStatus>('CONNECTING');
  const [participants, setParticipants] = useState<CollaborationParticipant[]>([]);
  const [roomInfo, setRoomInfo] = useState<CollaborationRoomInfoPayload | null>(null);
  const [collabError, setCollabError] = useState<CollaborationErrorPayload | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [collabClient, setCollabClient] = useState<CollaborationClient | null>(null);

  const clientRef = useRef<CollaborationClient | null>(null);
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeDocumentKey = activeTab.documentKey;

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

  // Connect to Collaboration Engine when Room, Token, and Document Key are ready
  useEffect(() => {
    if (!room || !accessToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || 'ws://localhost:4001/collaboration';

    const client = new CollaborationClient({
      wsUrl,
      token: accessToken,
      roomId: room.id,
      documentKey: activeDocumentKey,
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
    });

    clientRef.current = client;
    queueMicrotask(() => {
      setCollabClient(client);
    });
    client.connect();

    return () => {
      client.destroy();
      clientRef.current = null;
      setCollabClient(null);
    };
  }, [room, accessToken, activeDocumentKey]);

  // Keyboard shortcut listener (Alt+Z for Word Wrap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        setSettings((prev) => {
          const nextWrap = prev.wordWrap === 'on' ? 'off' : 'on';
          return saveEditorSettings({ wordWrap: nextWrap });
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleToggleWordWrap = () => {
    setSettings((prev) => {
      const nextWrap = prev.wordWrap === 'on' ? 'off' : 'on';
      return saveEditorSettings({ wordWrap: nextWrap });
    });
  };

  const handleFormatDocument = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const handleTabAdd = (name: string, languageId: string) => {
    const newId = `tab-${Date.now()}`;
    const detected = getLanguageFromFilename(name);
    const newTab: EditorTab = {
      id: newId,
      name,
      language: languageId || detected.id,
      documentKey: name,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleLanguageChange = (languageId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, language: languageId } : t)),
    );
  };

  const loadSampleCode = () => {
    if (roomInfo?.isReadOnly) return;
    const sample = `// SYNCODE Real-Time Universal Code Collaboration Session
// Document: ${activeDocumentKey}
// CRDT Engine: Yjs State Vectors + Lib0 Binary Protocol

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  
  await app.listen(4000);
  console.log('⚡ SYNCODE Engine running on port 4000');
}

bootstrap();
`;
    if (clientRef.current) {
      clientRef.current.setContent(sample);
    }
  };

  const isReadOnly = Boolean(roomInfo?.isReadOnly);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/dashboard"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <Link
            href={`/workspaces/${workspaceId}`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors truncate max-w-xs"
          >
            {workspace?.name || 'Workspace'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <Link
            href={`/workspaces/${workspaceId}/rooms`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Rooms
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 dark:text-zinc-100 font-semibold truncate">
            {room?.name || 'Room'}
          </span>
        </nav>

        {isLoading ? (
          <div className="p-8 rounded-2xl bg-[#111116] border border-zinc-800 shadow-sm animate-pulse space-y-4">
            <div className="h-8 w-48 bg-zinc-800 rounded" />
            <div className="h-4 w-72 bg-zinc-800/60 rounded" />
            <div className="h-96 w-full bg-zinc-800/40 rounded mt-6" />
          </div>
        ) : error || !room ? (
          <div className="p-8 rounded-2xl bg-[#111116] border border-red-900/60 text-center space-y-4">
            <div className="text-red-400 font-semibold">{error}</div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Room Header Strip */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#111116] border border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {room.name}
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-zinc-900 text-purple-400 border border-purple-500/20">
                    #{room.slug}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                    {room.visibility === 'PUBLIC' ? (
                      <>
                        <Globe className="w-3 h-3 text-sky-400" /> Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-zinc-400" /> Private
                      </>
                    )}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Role: {roomInfo?.role || workspace?.currentUserRole || 'MEMBER'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
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
              <div className="flex items-center gap-3 flex-wrap">
                {/* Connection Status Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-[#0d0d12]">
                  {collabStatus === 'CONNECTED' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-400">Live Sync</span>
                    </>
                  ) : collabStatus === 'CONNECTING' || collabStatus === 'RECONNECTING' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span className="text-xs font-medium text-amber-400">{collabStatus}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-medium text-red-400">{collabStatus}</span>
                      <button
                        onClick={handleReconnect}
                        className="text-zinc-400 hover:text-white ml-1"
                        title="Reconnect"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Share Room Button */}
                <button
                  onClick={copyRoomLink}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>{copiedLink ? 'Link Copied' : 'Share Room'}</span>
                </button>

                {/* Back to Rooms */}
                <Link
                  href={`/workspaces/${workspaceId}/rooms`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Rooms</span>
                </Link>
              </div>
            </div>

            {/* Read-Only Warning Banner */}
            {isReadOnly && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>View-Only Room Access:</strong> You are signed in as a Viewer. You can observe live collaborative code edits in real-time, but write actions are disabled.
                  </span>
                </div>
              </div>
            )}

            {/* Collaboration Error Banner */}
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

            {/* Main Full-Featured Code Editor Container */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0d0d12] shadow-2xl overflow-hidden flex flex-col">
              {/* Top Tab Bar & Action Controls */}
              <EditorTabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={handleTabSelect}
                onCloseTab={handleTabClose}
                onAddTab={handleTabAdd}
                currentLanguage={activeTab.language}
                onLanguageChange={handleLanguageChange}
                isWordWrap={settings.wordWrap === 'on'}
                onToggleWordWrap={handleToggleWordWrap}
                onFormatDocument={handleFormatDocument}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isReadOnly={isReadOnly}
              />

              {/* Editor Workspace & Collaborator Side-Pane */}
              <div className="flex flex-1 min-h-[560px] relative">
                {/* Monaco Code Editor */}
                <MonacoCodeEditor
                  collaborationClient={collabClient}
                  language={activeTab.language}
                  settings={settings}
                  isReadOnly={isReadOnly}
                  onCursorChange={(pos) => setCursorPos(pos)}
                  editorRef={editorRef}
                />

                {/* Live Collaborator Presence Roster */}
                <CollaboratorRoster
                  participants={participants}
                  currentUserId={user?.id}
                  isOpen={isRosterOpen}
                  onToggle={() => setIsRosterOpen(!isRosterOpen)}
                />
              </div>

              {/* IDE Bottom Status Bar */}
              <div className="h-8 px-4 bg-[#111116] border-t border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between select-none">
                {/* Left indicators */}
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>#{room.slug}</span>
                  </span>
                  <span className="hidden sm:inline text-zinc-600">|</span>
                  <span className="hidden sm:inline text-emerald-400">
                    CRDT Sync Active: {activeDocumentKey}
                  </span>
                </div>

                {/* Right indicators */}
                <div className="flex items-center gap-4">
                  {!isReadOnly && (
                    <button
                      onClick={loadSampleCode}
                      className="hover:text-purple-400 transition-colors hidden md:flex items-center gap-1 text-zinc-400"
                    >
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Sample Code</span>
                    </button>
                  )}
                  <span className="text-zinc-300">
                    Ln {cursorPos.line}, Col {cursorPos.column}
                  </span>
                  <span className="hidden sm:inline">Spaces: {settings.tabSize}</span>
                  <span className="hidden sm:inline">UTF-8</span>
                  <span className="text-purple-400 font-semibold uppercase">{activeTab.language}</span>
                </div>
              </div>
            </div>

            {/* System Specs Footer */}
            <div className="p-4 rounded-2xl bg-[#111116] border border-zinc-800 text-zinc-400 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>Architecture Specification</span>
              </div>
              <div className="flex items-center gap-6 text-[11px] text-zinc-500">
                <span>Transport: <strong className="text-zinc-300">Binary WebSocket</strong></span>
                <span>CRDT: <strong className="text-emerald-400">Yjs State Vectors</strong></span>
                <span>Editor: <strong className="text-purple-400">Microsoft Monaco</strong></span>
                <span>Presence: <strong className="text-zinc-300">Awareness Protocol</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Editor Settings Modal */}
        <EditorSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSettingsChange={(newSettings) => setSettings(newSettings)}
        />
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
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      }
    >
      <RoomDetailContent params={params} />
    </Suspense>
  );
}
