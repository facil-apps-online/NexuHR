import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para el reporte de errores (independiente del contexto de la app)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const nexuPlatformId = import.meta.env.VITE_PLATFORM_ID;

const errorReportClient = createClient(supabaseUrl, supabaseAnonKey);

// Reporta errores críticos a la Edge Function de NexuHR
const reportError = async (error: Error, info?: React.ErrorInfo) => {
  console.error("Caught an error:", error, info);

  const payload = {
    platform_id: nexuPlatformId,
    type: "error",
    message: error.message,
    details: {
      stack: error.stack,
      componentStack: info?.componentStack,
      userAgent: navigator.userAgent,
      appVersion: "NexuHR",
      timestamp: new Date().toISOString(),
    },
  };

  try {
    await errorReportClient.functions.invoke("tenant-actions", {
      body: JSON.stringify({
        action: "insert_system_alert",
        payload,
      }),
    });
  } catch (supabaseError) {
    console.error("Failed to report error to Supabase:", supabaseError);
  }
};

// Error Boundary para capturar errores de React
class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
          <h1>Algo salió mal.</h1>
          <p>Hemos sido notificados del problema y estamos trabajando para solucionarlo.</p>
          <button onClick={() => window.location.reload()}>Recargar la página</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Handler global para errores no capturados
window.onerror = (message, _source, _lineno, _colno, error) => {
  if (error) {
    reportError(error);
  } else {
    reportError(new Error(String(message)));
  }
  return true;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
