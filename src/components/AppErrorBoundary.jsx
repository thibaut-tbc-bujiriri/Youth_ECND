import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || "Une erreur inattendue est survenue.";
    const isSupabaseEnvError = message.includes("Variables Supabase manquantes");

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8fafc",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "680px",
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.1rem" }}>Application indisponible</h1>
          <p style={{ marginTop: "12px", marginBottom: 0, lineHeight: 1.5 }}>
            {isSupabaseEnvError
              ? "Configuration manquante sur l'environnement de deploiement. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables d'environnement Vercel puis redeploie."
              : message}
          </p>
        </div>
      </div>
    );
  }
}
