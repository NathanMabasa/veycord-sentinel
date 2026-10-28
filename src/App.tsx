import { useEffect, useRef } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Landing,PageFrame,ProductPage,DocsPage,RoadmapPage,SecurityPage,CommunityPage } from "./features/site/SitePages";
import Console from "./features/demo/Console";
import ApiExplorer from "./ApiExplorer";
import PrivateWorkspace from "./PrivateWorkspace";
import { appConfig } from "./config";
function RoutePosition() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (hash) {
      try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" }); } catch { /* Invalid fragments do not block navigation. */ }
    } else {
      window.scrollTo(0, 0);
      if (changed) {
        const heading = document.querySelector<HTMLElement>("h1");
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      }
    }
  }, [pathname, hash]);
  return null;
}
function App() {
  return (
    <BrowserRouter>
      <RoutePosition />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/api" element={<PageFrame eyebrow="API REFERENCE" title="Inspect the API, one request at a time." lead="Exercise the local synthetic-data read routes and inspect the exact JSON response."><ApiExplorer /></PageFrame>} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/demo" element={<Console />} />
        <Route path="/workspace" element={appConfig.publicDemo ? <SelfHosting /> : <PageFrame compact eyebrow="Private workspace" title="Investigation workspace" lead="Review stored events, investigate findings, and track cases in your private database."><PrivateWorkspace /></PageFrame>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
function SelfHosting() {
  return (
    <PageFrame eyebrow="SELF-HOSTING" title="Your workspace. Your infrastructure." lead="This public site runs the synthetic demo. To connect a database, run Veycord Sentinel in your own private environment.">
      <section className="docs-article">
        <h2>Start with the open-source application</h2>
        <p>The GitHub project includes the application, PostgreSQL schema, migrations, API and setup instructions. Keep credentials and records in your own environment.</p>
        <p>The private workspace is an early single-operator foundation. Use synthetic data while the documented security and operational release gates remain open.</p>
        <p><a className="button button-primary" href={`${appConfig.githubUrl}/blob/main/docs/PRIVATE-WORKSPACE.md`} target="_blank" rel="noreferrer">Read the self-hosting guide</a></p>
        <p><Link className="button button-dark-outline" to="/demo">Return to the demo</Link></p>
      </section>
    </PageFrame>
  );
}
function NotFound() {
  return (
    <PageFrame
      eyebrow="NOT FOUND"
      title="That page isn’t here."
      lead="Use the navigation to return to the product, documentation, roadmap, or demo."
    >
      <Link className="button button-primary" to="/">
        Back to Veycord Sentinel
      </Link>
    </PageFrame>
  );
}
export default App;
