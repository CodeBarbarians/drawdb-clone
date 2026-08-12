import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { API_BASE_URL } from "../api/client";
import { GithubIcon, GoogleIcon } from "../components/icons/OAuthIcons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

const OAUTH_ERROR_MESSAGES = {
  google_denied: "Google sign-in was cancelled.",
  google_token_exchange_failed: "Google sign-in failed. Please try again.",
  google_userinfo_failed: "Google sign-in failed. Please try again.",
  google_email_unverified: "Your Google email isn't verified.",
  github_denied: "GitHub sign-in was cancelled.",
  github_token_exchange_failed: "GitHub sign-in failed. Please try again.",
  github_userinfo_failed: "GitHub sign-in failed. Please try again.",
  github_email_unavailable: "Couldn't get a verified email from GitHub.",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get("oauth_error");
    return oauthError ? OAUTH_ERROR_MESSAGES[oauthError] || "Sign-in failed." : "";
  });
  const [loading, setLoading] = useState(false);
  const returnTo = searchParams.get("returnTo");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(returnTo || "/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const oauthUrl = (provider) =>
    `${API_BASE_URL}/auth/${provider}/login?returnTo=${encodeURIComponent(returnTo || "/")}`;

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__brand">
          <Logo size={36} />
          <h1>drawdb-clone</h1>
        </div>
        <p className="auth-card__subtitle">Sign in to your diagrams</p>
        {error && <div className="auth-card__error">{error}</div>}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="mt-1.5" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" asChild>
          <a href={oauthUrl("google")}>
            <GoogleIcon className="h-4 w-4" /> Continue with Google
          </a>
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={oauthUrl("github")}>
            <GithubIcon className="h-4 w-4" /> Continue with GitHub
          </a>
        </Button>

        <p className="auth-card__footer">
          No account?{" "}
          <Link to={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}>Register</Link>
        </p>
      </form>
    </div>
  );
}
