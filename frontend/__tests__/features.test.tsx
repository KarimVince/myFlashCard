/**
 * Launch switches and who sees what: with AI and accounts off, the site looks like v1.
 * AI screens are for admins always, and for logged-in members only while AI and Premium are on.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Nav from "@/components/Nav";
import { FooterAccountLink } from "@/components/ConditionalShell";
import HowToPage from "@/app/how-to/page";
import { AuthProvider, useAuth } from "@/lib/auth";
import { FeaturesProvider } from "@/lib/features";
import * as api from "@/lib/api";
import { User } from "@/lib/types";

jest.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getSettings: jest.fn(),
  getMe: jest.fn(),
}));

const MEMBER: User = {
  id: 1, alias: "Maker", email: "m@example.com", role: "user", tier: "none", email_verified: true,
  created_at: "2026-09-01T00:00:00Z",
};
const ADMIN: User = { ...MEMBER, id: 2, alias: "Boss", role: "admin" };
const ALL_ON = { premium_enabled: true, accounts_enabled: true, ai_enabled: true };

function loginAs(user: User) {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getMe as jest.Mock).mockResolvedValue(user);
}

function renderWith(ui: React.ReactNode) {
  return render(<FeaturesProvider><AuthProvider>{ui}</AuthProvider></FeaturesProvider>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test("nav hides Create and Log in while AI and accounts are off", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  renderWith(<Nav />);
  expect(await screen.findByText("Library")).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByText("Create")).not.toBeInTheDocument();
  expect(screen.queryByText("Log in")).not.toBeInTheDocument();
});

test("visitors see Log in but never Create, even with everything on", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue(ALL_ON);
  renderWith(<Nav />);
  expect(await screen.findByText("Log in")).toBeInTheDocument();
  expect(screen.queryByText("Create")).not.toBeInTheDocument();
});

test("logged-in members see Create only while AI and Premium are on", async () => {
  loginAs(MEMBER);
  (api.getSettings as jest.Mock).mockResolvedValue({ ...ALL_ON, premium_enabled: false });
  const { unmount } = renderWith(<Nav />);
  expect(await screen.findByText("Maker")).toBeInTheDocument();
  expect(screen.queryByText("Create")).not.toBeInTheDocument();
  unmount();

  (api.getSettings as jest.Mock).mockResolvedValue(ALL_ON);
  renderWith(<Nav />);
  expect(await screen.findByText("Create")).toBeInTheDocument();
  expect(screen.queryByText("Admin")).not.toBeInTheDocument();
});

test("admins always see Create and Admin", async () => {
  loginAs(ADMIN);
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  renderWith(<Nav />);
  expect(await screen.findByText("Create")).toBeInTheDocument();
  expect(screen.getByText("Admin")).toBeInTheDocument();
});

test("logging out also ends an admin-password session, so Admin disappears", async () => {
  sessionStorage.setItem("mfc_admin_token", "the-admin-password");
  (api.getSettings as jest.Mock).mockResolvedValue(ALL_ON);
  function LogoutButton() {
    const { logout } = useAuth();
    return <button onClick={() => logout()}>Log out</button>;
  }
  renderWith(<><Nav /><LogoutButton /></>);
  expect(await screen.findByText("Admin")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  await waitFor(() => expect(sessionStorage.getItem("mfc_admin_token")).toBeNull());
});

test("footer shows Admin to visitors and admins, not to other members", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue(ALL_ON);
  const { unmount } = renderWith(<FooterAccountLink />);
  expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  unmount();

  loginAs(MEMBER);
  const member = renderWith(<FooterAccountLink />);
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  member.unmount();

  loginAs(ADMIN);
  renderWith(<FooterAccountLink />);
  expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
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

test("how-to shows only the manual method to members while Premium is off", async () => {
  loginAs(MEMBER);
  (api.getSettings as jest.Mock).mockResolvedValue({ ...ALL_ON, premium_enabled: false });
  renderWith(<HowToPage />);
  expect(await screen.findByText("Copy the AI prompt for your deck type")).toBeInTheDocument();
  expect(screen.queryByText(/Generate with AI/)).not.toBeInTheDocument();
});

test("how-to shows both paths to members when AI and Premium are on", async () => {
  loginAs(MEMBER);
  (api.getSettings as jest.Mock).mockResolvedValue(ALL_ON);
  renderWith(<HowToPage />);
  expect(await screen.findByText("✨ Generate with AI")).toBeInTheDocument();
  expect(screen.getByText("🛠️ Do it manually")).toBeInTheDocument();
});

test("how-to shows both paths to admins even with everything off", async () => {
  loginAs(ADMIN);
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  renderWith(<HowToPage />);
  expect(await screen.findByText("✨ Generate with AI")).toBeInTheDocument();
});

test("account tabs hide AI settings from members while Premium is off", async () => {
  const AccountHeader = (await import("@/components/account/AccountHeader")).default;
  loginAs(MEMBER);
  (api.getSettings as jest.Mock).mockResolvedValue({ ...ALL_ON, premium_enabled: false });
  const { unmount } = renderWith(<AccountHeader user={MEMBER} />);
  expect(await screen.findByRole("button", { name: "Log out" })).toBeInTheDocument();
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByRole("link", { name: "AI settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument(); // no tab bar for one tab
  unmount();

  (api.getSettings as jest.Mock).mockResolvedValue(ALL_ON);
  const member = renderWith(<AccountHeader user={MEMBER} />);
  expect(await screen.findByRole("link", { name: "AI settings" })).toBeInTheDocument();
  member.unmount();

  loginAs(ADMIN);
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false, accounts_enabled: false, ai_enabled: false });
  renderWith(<AccountHeader user={ADMIN} />);
  expect(await screen.findByRole("link", { name: "AI settings" })).toBeInTheDocument();
});
