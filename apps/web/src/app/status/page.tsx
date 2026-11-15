'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { HealthResponse } from '@syncode/validation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function StatusPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    setErrorMsg(null);
    try {
      const result = await apiClient.getHealth();
      setHttpStatus(result.status);
      if (result.data) {
        setHealthData(result.data);
      }
      if (result.error && !result.data) {
        setErrorMsg(result.error);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialStatus() {
      try {
        const result = await apiClient.getHealth();
        if (!ignore) {
          setHttpStatus(result.status);
          if (result.data) {
            setHealthData(result.data);
          }
          if (result.error && !result.data) {
            setErrorMsg(result.error);
          }
          setLastUpdated(new Date());
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to connect to API');
          setLoading(false);
        }
      }
    }

    void loadInitialStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchStatus();
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const getStatusBadge = (status?: 'up' | 'down') => {
    if (status === 'up') {
      return <Badge variant="success">Online</Badge>;
    }
    return <Badge variant="destructive">Offline</Badge>;
  };

  const getOverallBadge = (status?: 'ok' | 'degraded' | 'down') => {
    if (status === 'ok') {
      return <Badge variant="success" className="text-sm px-3 py-1">Operational (HTTP 200)</Badge>;
    }
    if (status === 'degraded') {
      return <Badge variant="warning" className="text-sm px-3 py-1">Degraded (HTTP 503)</Badge>;
    }
    return <Badge variant="destructive" className="text-sm px-3 py-1">Down / Unreachable</Badge>;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            System Health &amp; Infrastructure
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time status monitoring for SYNCODE Phase 1 infrastructure services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-xs"
          >
            {loading ? 'Checking...' : 'Refresh Now'}
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className="my-8">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Platform Health Status</CardTitle>
                <CardDescription className="mt-1">
                  Target endpoint:{' '}
                  <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-xs font-mono">
                    GET /api/v1/health
                  </code>
                </CardDescription>
              </div>
              <div>{getOverallBadge(healthData?.status)}</div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">HTTP Status: </span>
              {httpStatus ? `${httpStatus}` : 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">Uptime: </span>
              {healthData ? `${healthData.uptime}s` : 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">Version: </span>
              {healthData?.version || '0.1.0'}
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">Last Checked: </span>
              {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          <strong>Notice: </strong> {errorMsg}
        </div>
      )}

      {/* Service Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* API Service */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-500">NestJS Core</span>
              {getStatusBadge(healthData?.services.api.status)}
            </div>
            <CardTitle className="mt-2 text-base">Backend API</CardTitle>
            <CardDescription className="text-xs">
              Express adapter &bull; Global Prefix /api/v1
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Latency:</span>
              <span className="font-mono">{healthData?.services.api.latencyMs ?? 0} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Response Code:</span>
              <span className="font-mono">{httpStatus ?? 'Down'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-500">Prisma ORM</span>
              {getStatusBadge(healthData?.services.database.status)}
            </div>
            <CardTitle className="mt-2 text-base">PostgreSQL Database</CardTitle>
            <CardDescription className="text-xs">
              Primary relational store &bull; Port 5432
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Latency:</span>
              <span className="font-mono">{healthData?.services.database.latencyMs ?? 'N/A'} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status Details:</span>
              <span className="truncate max-w-[140px] text-right font-mono" title={healthData?.services.database.message}>
                {healthData?.services.database.message ?? 'Waiting for probe'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Redis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-zinc-500">ioredis</span>
              {getStatusBadge(healthData?.services.redis.status)}
            </div>
            <CardTitle className="mt-2 text-base">Redis Cache</CardTitle>
            <CardDescription className="text-xs">
              In-memory cache &amp; pub/sub broker &bull; Port 6379
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Latency:</span>
              <span className="font-mono">{healthData?.services.redis.latencyMs ?? 'N/A'} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status Details:</span>
              <span className="truncate max-w-[140px] text-right font-mono" title={healthData?.services.redis.message}>
                {healthData?.services.redis.message ?? 'Waiting for probe'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

