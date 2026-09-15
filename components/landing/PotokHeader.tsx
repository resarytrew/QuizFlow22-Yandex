import { Link } from "@tanstack/react-router";
import { useAuthStore } from "../../store/useAuthStore";
import { useUIStore } from "../../store/useUIStore";
import { useRef } from "react";

export default function PotokHeader({ onCTA }: { onCTA: () => void }) {
  const session = useAuthStore((state) => state.session);
  const setAuthModalOpen = useUIStore((state) => state.setAuthModalOpen);
  const menu = useRef<HTMLDetailsElement>(null);
  const sectionLink =
    (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (menu.current) menu.current.open = false;
      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
    };
  const links = (
    <>
      <a href="#features" onClick={sectionLink("features")}>
        Возможности
      </a>
      <a href="#templates" onClick={sectionLink("templates")}>
        Лучшие квизы
      </a>
      <Link to="/public">Галерея</Link>
      <a href="#pricing" onClick={sectionLink("pricing")}>
        Тарифы
      </a>
    </>
  );
  return (
    <header className="potok-header">
      <Link to="/" className="potok-brand" aria-label="Поток — главная">
        <img
          src="/assets/landing/potok-mark.svg"
          alt=""
          width="52"
          height="40"
        />
        <span>Поток</span>
      </Link>
      <nav aria-label="Навигация по главной странице">{links}</nav>
      <div className="potok-header-actions">
        {session ? (
          <Link to="/dashboard">Мои проекты</Link>
        ) : (
          <button onClick={() => setAuthModalOpen(true)}>Войти</button>
        )}
        <button className="potok-button-secondary" onClick={onCTA}>
          {session ? "Создать сценарий" : "Начать бесплатно"}
        </button>
        <details ref={menu} className="potok-mobile-menu">
          <summary>Меню</summary>
          <nav aria-label="Мобильная навигация">
            {links}
            <button
              className="potok-button"
              onClick={() => {
                if (menu.current) menu.current.open = false;
                onCTA();
              }}
            >
              Создать сценарий
            </button>
          </nav>
        </details>
      </div>
    </header>
  );
}
