/**
 * IntegrityPlay Frontend API Client
 * ================================
 * 
 * Centralized HTTP client for communicating with the IntegrityPlay backend API.
 * Provides TypeScript types and configured axios instance for all API operations.
 * 
 * Technical Features:
 * - Automatic API key authentication via X-API-Key header
 * - Environment-based configuration for different deployment targets
 * - TypeScript type definitions for all API responses
 * - Consistent error handling and request/response interceptors
 * 
 * API Endpoints:
 * - GET /api/alerts - Paginated alert listing with filtering
 * - GET /api/alerts/{id} - Individual alert details with evidence
 * - POST /api/run_demo - Trigger fraud detection demonstration
 * - POST /api/alerts/{id}/download_pack - Evidence package download
 * - GET /api/health - System health and status checks
 * 
 * Configuration:
 * - NEXT_PUBLIC_API_BASE_URL: Backend API base URL (default: localhost:8000)
 * - NEXT_PUBLIC_API_KEY: Authentication key for API access (default: demo_key)
 * 
 * Usage:
 * import { api, Alert, AlertListResponse } from '@/lib/api';
 * const response = await api.get<AlertListResponse>('/api/alerts');
 */

import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'demo_key';

export const api = axios.create({ 
  baseURL, 
  headers: { 'x-api-key': apiKey },
  timeout: 30000
});

export type Alert = {
  alert_id: string;
  score?: number;
  anchored?: boolean;
  evidence_path?: string | null;
  rule_flags?: Record<string, any>;
  signals?: Record<string, any>;
  created_at?: string;
};

export type AlertListResponse = {
  total: number;
  items: Alert[];
};

