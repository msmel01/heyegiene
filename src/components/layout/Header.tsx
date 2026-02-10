import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="header_container">
        <div className="header_logo">Heyegiene</div>

        <nav className="header_nav">
          <a href="#tool">Use</a>
          <a href="#about">About</a>
          <a href="#about">FAQ</a>
        </nav>
      </div>
    </header>
  );
}
