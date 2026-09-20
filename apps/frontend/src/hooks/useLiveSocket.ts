import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { liveSocketUrl } from "../api/client";
import type { Workstream } from "../types";

export type LiveStatus = "connecting" | "open" | "closed";

/**
 * Subscribes to the backend's `/api/ws/workstreams` live feed. On every
 * broadcast (an approved workstream), invalidates the
 * `workstreams`/`summary`/`history`/`audit` queries so every tab reflects
 * the change without polling. Reconnects with backoff if the socket drops.
 */
export function useLiveSocket(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const qc = useQueryClient();
  const retryRef = useRef(0);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      socket = new WebSocket(liveSocketUrl());

      socket.onopen = () => {
        retryRef.current = 0;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as Workstream | { type: "keepalive" };
        if ("type" in payload && payload.type === "keepalive") return;
        qc.invalidateQueries({ queryKey: ["workstreams"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
        qc.invalidateQueries({ queryKey: ["history"] });
      };

      socket.onclose = () => {
        setStatus("closed");
        if (cancelled) return;
        const delay = Math.min(1000 * 2 ** retryRef.current, 15000);
        retryRef.current += 1;
        retryTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [qc]);

  return status;
}
