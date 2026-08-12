import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallbackPage() {
  const { completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get("token");
    const returnTo = searchParams.get("returnTo") || "/";
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    completeOAuthLogin(token)
      .then(() => navigate(returnTo, { replace: true }))
      .catch(() => setError("Sign-in failed. Please try again."));
  }, [completeOAuthLogin, navigate, searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-card__subtitle">{error || "Signing you in…"}</p>
        {error && (
          <a className="auth-card__footer" href="/login">
            Back to sign in
          </a>
        )}
      </div>
    </div>
  );
}
