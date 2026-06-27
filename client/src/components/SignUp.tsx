import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setPassword("");
      setConfirmPassword("");
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
          <h1 className="font-display italic text-xl text-ink">Reading Room</h1>
          <p className="text-xs text-ink/55 mt-1">Create an account.</p>
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
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-ember/40"
          />
          <p className="text-[11px] text-ink/40">At least 8 characters.</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/45">
            Confirm password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-line/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-ember/40"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ember text-paper text-sm py-2 rounded-lg disabled:opacity-50 hover:bg-ember/90 transition-colors"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-xs text-ink/55 text-center">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="text-ember underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
