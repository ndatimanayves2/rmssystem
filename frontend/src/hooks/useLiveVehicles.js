import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * useLiveVehicles
 * Opens a socket.io connection to the backend and listens for real-time
 * GPS updates (`gps_update` events) broadcast by the delivery controller.
 * Returns a ref-map of the latest reported positions keyed by vehicle id,
 * plus a connection status flag.
 */
export default function useLiveVehicles(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const livePositionsRef = useRef({});

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Socket URL from frontend/.env (VITE_SOCKET_URL).
    // Falls back to same origin; Vite proxies /socket.io -> backend (see vite.config.js),
    // and nginx proxies it in Docker.
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('gps_update', (payload) => {
      if (!payload || !payload.vehicle_id) return;
      livePositionsRef.current[payload.vehicle_id] = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        timestamp: payload.timestamp || new Date().toISOString(),
      };
      setLastUpdate(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);
  return { livePositionsRef, connected, lastUpdate };
}
