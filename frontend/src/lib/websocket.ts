'use client';
import { useEffect, useRef, useState } from 'react';

export interface ReconnectingWSOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useReconnectingWebSocket(
  url: string | null,
  options: ReconnectingWSOptions = {},
): { connected: boolean; lastMessage: unknown; send: (data: string | object) => void } {
  const { maxRetries = 8, retryDelayMs = 1000, onMessage, onOpen, onClose } = options;
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const closedByUserRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!url) return;
    closedByUserRef.current = false;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retriesRef.current = 0;
        setConnected(true);
        onOpen?.();
      };
      ws.onmessage = (e) => {
        let parsed: unknown = e.data;
        try { parsed = JSON.parse(e.data); } catch { /* keep raw */ }
        setLastMessage(parsed);
        onMessage?.(parsed);
      };
      ws.onclose = () => {
        setConnected(false);
        onClose?.();
        if (closedByUserRef.current) return;
        if (retriesRef.current >= maxRetries) return;
        const delay = Math.min(retryDelayMs * 2 ** retriesRef.current, 30_000);
        retriesRef.current += 1;
        timeoutRef.current = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* noop */ }
      };
    };

    connect();
    return () => {
      closedByUserRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url, maxRetries, retryDelayMs, onMessage, onOpen, onClose]);

  const send = (data: string | object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(typeof data === 'string' ? data : JSON.stringify(data));
  };

  return { connected, lastMessage, send };
}
