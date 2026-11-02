import { Link, useLocation } from "react-router-dom";
import "./Brand.css";
export default function Brand({ variant }: { variant?: "sentinel" | "finance" } = {}) {
  const { pathname } = useLocation();
  const finance = variant ? variant === "finance" : pathname === "/financials" || pathname.startsWith("/financials/");
  return (
    <Link to={finance ? "/product#finance" : "/"} className={finance ? "brand brand--finance" : "brand"} aria-label={finance ? "Veycord Finance home" : "Veycord Sentinel home"}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      <span className="brand-name">
        <b>veycord</b>{" "}
        <small>{finance ? "finance" : "sentinel"}</small>
      </span>
    </Link>
  );
}
