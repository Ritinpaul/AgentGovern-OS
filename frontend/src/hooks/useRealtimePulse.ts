import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LIVE_WS_URL } from "@/lib/api";

type RealtimePulse = {
    connected: boolean;
    lastHeartbeatAt: string | null;
    reconnectAttempt: number;
};

export function useRealtimePulse(): RealtimePulse {
    const queryClient = useQueryClient();
    const [connected, setConnected] = useState(false);
    const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    const socketRef = useRef<WebSocket | null>(null);
    const retryTimerRef = useRef<number | null>(null);

    const wsUrl = useMemo(() => LIVE_WS_URL, []);

    useEffect(() => {
        let isUnmounted = false;

        const connect = () => {
            if (isUnmounted) {
                return;
            }

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                if (isUnmounted) {
                    return;
                }
                setConnected(true);
                setReconnectAttempt(0);
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload?.type === "heartbeat") {
                        setLastHeartbeatAt(payload.ts ?? new Date().toISOString());
                        queryClient.invalidateQueries({ queryKey: ["agents"] });
                        queryClient.invalidateQueries({ queryKey: ["governance-metrics"] });
                        queryClient.invalidateQueries({ queryKey: ["gateways"] });
                    }
                } catch {
                    // Ignore non-JSON frames.
                }
            };

            ws.onclose = () => {
                if (isUnmounted) {
                    return;
                }
                setConnected(false);
                setReconnectAttempt((prev) => {
                    const next = prev + 1;
                    const delayMs = Math.min(10000, 1000 * next);
                    retryTimerRef.current = window.setTimeout(connect, delayMs);
                    return next;
                });
            };

            ws.onerror = () => {
                ws.close();
            };
        };

        connect();

        return () => {
            isUnmounted = true;
            if (retryTimerRef.current) {
                window.clearTimeout(retryTimerRef.current);
            }
            socketRef.current?.close();
        };
    }, [queryClient, wsUrl]);

    return { connected, lastHeartbeatAt, reconnectAttempt };
}
