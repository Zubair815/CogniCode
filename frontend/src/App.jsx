/**
 * Temporary smoke test for the component library.
 * Will be replaced with real routing in Step 0.12.
 *
 * Created: 10/10/2026
 * Author: Abdullah (BSEF23M526)
 */

import { useTheme } from "./context/ThemeContext.jsx";
import Button from "./components/ui/Button.jsx";
import Input from "./components/ui/Input.jsx";
import Card from "./components/ui/Card.jsx";
import Badge from "./components/ui/Badge.jsx";
import Logo from "./components/brand/Logo.jsx";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen p-8 bg-[color:var(--bg)] text-[color:var(--text)]">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-8">
        <Logo size={40} withWordmark />
        <Button variant="secondary" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
        </Button>
      </header>

      <main className="max-w-3xl mx-auto space-y-6">
        <Card title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
          </div>
        </Card>

        <Card title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Low</Badge>
            <Badge tone="warning">Moderate</Badge>
            <Badge tone="danger">High</Badge>
            <Badge tone="info">Session 7</Badge>
            <Badge tone="violet">Hint L3</Badge>
            <Badge>Neutral</Badge>
          </div>
        </Card>

        <Card title="Form">
          <Input label="Email" placeholder="you@pucit.edu.pk" />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error="Password must be at least 8 characters"
          />
          <Input
            label="Preferred Language"
            placeholder="Python"
            hint="Used to tailor code examples"
          />
        </Card>
      </main>
    </div>
  );
}