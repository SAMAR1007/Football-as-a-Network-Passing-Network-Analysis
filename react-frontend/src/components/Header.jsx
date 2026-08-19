import Logo from "./Logo";

export default function Header() {
  return (
    <header>
      <div className="header-top">
        <div className="nav-brand">
          <Logo size={56} className="nav-logo" />
        </div>
        <div className="header-links">
          <a className="home-link" href="#/data">
            Data characteristics
          </a>
          <a className="home-link" href="#/">
            <span aria-hidden="true">&#8592;</span>
            Back to home
          </a>
        </div>
      </div>
    </header>
  );
}
