/**
 * Launch switches: with AI and accounts off, the site looks like v1.
 */
import { render, screen } from "@testing-library/react";
import Nav from "@/components/Nav";
import HowToPage from "@/app/how-to/page";
import { AuthProvider } from "@/lib/auth";
import { FeaturesProvider } from "@/lib/features";
import * as api from "@/lib/api";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getSettings: jest.fn(),
}));

function renderWith(ui: React.ReactNode) {
  return render(<FeaturesProvider><AuthProvider>{ui}</AuthProvider></FeaturesProvider>);
}

beforeEach(() => localStorage.clear());

test("nav hides Create and Log in while AI and accounts are off", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  renderWith(<Nav />);
  expect(await screen.findByText("Library")).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByText("Create")).not.toBeInTheDocument();
  expect(screen.queryByText("Log in")).not.toBeInTheDocument();
});

test("nav shows Create and Log in when switched on", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: true, ai_enabled: true });
  renderWith(<Nav />);
  expect(await screen.findByText("Create")).toBeInTheDocument();
  expect(await screen.findByText("Log in")).toBeInTheDocument();
});

test("nav shows Admin only while signed in as admin with the password", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  const { unmount } = renderWith(<Nav />);
  expect(await screen.findByText("Library")).toBeInTheDocument();
  expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  unmount();

  sessionStorage.setItem("mfc_admin_token", "the-admin-password");
  renderWith(<Nav />);
  expect(await screen.findByText("Admin")).toBeInTheDocument();
  sessionStorage.clear();
});

test("how-to shows only the manual method while AI is off", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  renderWith(<HowToPage />);
  expect(await screen.findByText("Copy the AI prompt for your deck type")).toBeInTheDocument();
  expect(screen.queryByText(/Generate with AI/)).not.toBeInTheDocument();
  expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
});

test("how-to shows both paths when AI is on", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: true, ai_enabled: true });
  renderWith(<HowToPage />);
  expect(await screen.findByText("✨ Generate with AI")).toBeInTheDocument();
  expect(screen.getByText("🛠️ Do it manually")).toBeInTheDocument();
});
