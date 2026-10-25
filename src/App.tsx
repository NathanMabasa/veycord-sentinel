import { useEffect, useRef } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Landing,PageFrame,ProductPage,DocsPage,RoadmapPage,SecurityPage,CommunityPage } from "./features/site/SitePages";
import Console from "./features/demo/Console";
import ApiExplorer from "./ApiExplorer";
import PrivateWorkspace from "./PrivateWorkspace";
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
        <Route path="/workspace" element={<PageFrame compact eyebrow="Private workspace" title="Investigation workspace" lead="Review stored events, investigate findings, and track cases in your private database."><PrivateWorkspace /></PageFrame>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
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
