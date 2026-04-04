import { useLocation, Link } from "react-router-dom";
import { Home, BarChart3, Settings, Code } from "lucide-react";
import { IS_DEV } from "../config";

const baseTabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/progress", label: "Progress", icon: BarChart3 },
  { path: "/settings", label: "Settings", icon: Settings },
];

const tabs = IS_DEV
  ? [...baseTabs, { path: "/dev", label: "Dev", icon: Code }]
  : baseTabs;

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-label={tab.label}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-2 transition-colors ${
                isActive ? "text-orange-400" : "text-slate-500"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium mt-0.5">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
