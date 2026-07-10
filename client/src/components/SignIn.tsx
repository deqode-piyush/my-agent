import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      // Never let the password linger in component state longer than the
      // single request it was needed for.
      setPassword("");
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-paper/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-line/15 rounded-xl shadow-sm p-6 space-y-4"
      >
        <div>
          <h1 className="font-display italic text-xl text-ink">Cortex</h1>
          <p className="text-xs text-ink/55 mt-1">Sign in to continue.</p>
        </div>

        {error && (
          <p className="text-xs text-ember bg-ember/10 border border-ember/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/45">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-ember/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/45">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-ember/40"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ember text-paper text-sm py-2 rounded-lg disabled:opacity-50 hover:bg-ember/90 transition-colors"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-ink/55 text-center">
          No account?{" "}
          <Link
            to="/signup"
            className="text-ember underline underline-offset-2"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
