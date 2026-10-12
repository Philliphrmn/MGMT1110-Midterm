import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { StoreProvider, useStore } from "./lib/store";
import { go, useRoute } from "./lib/router";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import StudyPage from "./pages/StudyPage";
import BrowsePage from "./pages/BrowsePage";
import TestPage from "./pages/TestPage";
import TestHistoryPage from "./pages/TestHistoryPage";
import OpenPage from "./pages/OpenPage";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="center muted">Loading…</div>;
  if (!session) return <AuthPage />;

  return (
    <StoreProvider key={session.user.id}>
      <Shell email={session.user.email ?? ""} />
    </StoreProvider>
  );
}

function Shell({ email }: { email: string }) {
  const route = useRoute();
  const { loading, error, reload } = useStore();
  const [section, arg, sub] = route;

  const nav = [
    { key: "", label: "Home" },
    { key: "study", label: "Learn", href: "/study/all" },
    { key: "test", label: "Test" },
    { key: "open", label: "Open-ended", href: "/open/all" },
    { key: "browse", label: "Catalog", href: "/browse/all" },
  ];

  let page;
  if (loading) page = <div className="center muted">Loading questions…</div>;
  else if (error)
    page = (
      <div className="card">
        <p className="error">Could not load data: {error}</p>
        <button onClick={() => void reload()}>Retry</button>
      </div>
    );
  else if (section === "study") page = <StudyPage key={`s-${arg}`} scope={arg ?? "all"} mode="srs" />;
  else if (section === "practice") page = <StudyPage key={`p-${arg}`} scope={arg ?? "all"} mode="practice" />;
  else if (section === "browse") page = <BrowsePage scope={arg ?? "all"} />;
  else if (section === "test" && arg === "history") page = <TestHistoryPage openId={sub} />;
  else if (section === "test") page = <TestPage />;
  else if (section === "open") page = <OpenPage scope={arg ?? "all"} />;
  else page = <HomePage />;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          MGMT 1110 <span>Trainer</span>
        </button>
        <nav>
          {nav.map((n) => (
            <a key={n.key} href={`#${n.href ?? "/" + n.key}`} className={(section ?? "") === n.key ? "active" : ""}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="user">
          <span className="muted small" title={email}>
            {email}
          </span>
          <button className="ghost small" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main>{page}</main>
    </div>
  );
}
