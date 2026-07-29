import { Component } from "react";

// If any page crashes while rendering, show the actual error instead of a
// white screen — so bug reports contain the real message, not a mystery.
export default class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[GrOrbit] render crash:", error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FAFAFA", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontSize: 40, margin: 0 }}>😵</p>
          <h1 style={{ color: "#1F2937", fontSize: 20, fontWeight: 800 }}>Something broke on this page</h1>
          <p style={{ color: "#6B7280", fontSize: 14 }}>Share this message and we can fix it fast:</p>
          <pre style={{ background: "#FEF2F2", color: "#B91C1C", padding: 12, borderRadius: 12, fontSize: 12, whiteSpace: "pre-wrap", textAlign: "left" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 12, border: 0, background: "#E08A5B", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Reload</button>
        </div>
      </div>
    );
  }
}
