'use client';

import React from 'react';
import { Users, ChevronRight, ChevronLeft, ShieldCheck, UserCheck, Eye } from 'lucide-react';
import type { CollaborationParticipant } from '@/lib/collaboration-client';

interface CollaboratorRosterProps {
  participants: CollaborationParticipant[];
  currentUserId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function CollaboratorRoster({
  participants,
  currentUserId,
  isOpen,
  onToggle,
}: CollaboratorRosterProps) {
  const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <ShieldCheck className="w-3 h-3" /> OWNER
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <UserCheck className="w-3 h-3" /> ADMIN
          </span>
        );
      case 'VIEWER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Eye className="w-3 h-3" /> VIEWER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            MEMBER
          </span>
        );
    }
  };

  return (
    <aside
      className={`border-l border-zinc-800 bg-[#0d0d12] flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64 min-w-[16rem]' : 'w-10 min-w-[2.5rem]'
      }`}
      aria-label="Room Collaborators"
    >
      {/* Roster Header */}
      <div className="h-10 px-2.5 border-b border-zinc-800 flex items-center justify-between bg-[#111116] select-none">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          title={isOpen ? 'Collapse Collaborators' : 'Expand Collaborators'}
        >
          <div className="relative">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          {isOpen && (
            <div className="flex items-center gap-1.5">
              <span>Collaborators</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                {participants.length}
              </span>
            </div>
          )}
        </button>

        <button
          onClick={onToggle}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title={isOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {isOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Roster List (Expanded) */}
      {isOpen ? (
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto custom-editor-scrollbar">
          {participants.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">No other collaborators active</div>
          ) : (
            participants.map((p) => {
              const isCurrentUser = p.id === currentUserId;
              return (
                <div
                  key={`${p.clientId}-${p.id}`}
                  className="p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 transition-colors flex items-center gap-2.5"
                >
                  {/* Avatar / Color Circle */}
                  <div
                    className="relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0"
                    style={{
                      backgroundColor: p.color,
                      border: `2px solid ${p.color}`,
                    }}
                  >
                    {p.displayName ? p.displayName.charAt(0).toUpperCase() : 'U'}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0d0d12]" />
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {p.displayName || p.username}
                        {isCurrentUser && <span className="ml-1 text-[10px] text-purple-400">(You)</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                      {getRoleBadge(p.role)}
                      {p.cursor ? (
                        <span className="font-mono text-[10px] text-zinc-500">
                          Ln {p.cursor.line}, Col {p.cursor.column}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600">Idle</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Collapsed View: Compact avatar list */
        <div className="flex-1 py-2 flex flex-col items-center gap-2 overflow-y-auto">
          {participants.map((p) => (
            <div
              key={`${p.clientId}-${p.id}`}
              className="relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white cursor-pointer shadow-sm flex-shrink-0"
              style={{
                backgroundColor: p.color,
              }}
              title={`${p.displayName || p.username} (${p.role})`}
              onClick={onToggle}
            >
              {p.displayName ? p.displayName.charAt(0).toUpperCase() : 'U'}
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-[#0d0d12]" />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
