import { Link } from "react-router-dom";
export default function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Veycord Sentinel home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
      </span>
      <span className="brand-name">
        <b>veycord</b>
        <small>sentinel</small>
      </span>
    </Link>
  );
}
