/**
 * Tests for account login and the admin Members page.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/account/login/page";
import MembersPage from "@/app/admin/members/page";
import { AuthProvider } from "@/lib/auth";
import * as api from "@/lib/api";
import { User } from "@/lib/types";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/account/login",
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("next=/admin"),
}));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  login: jest.fn(),
  getMe: jest.fn(),
  adminListUsers: jest.fn(),
  adminSetService: jest.fn(),
  getToken: jest.fn(() => "admin-token"),
}));

const USER: User = {
  id: 7,
  alias: "Alice",
  email: "alice@example.com",
  role: "user",
  email_verified: true,
  services: [],
  created_at: "2026-09-01T00:00:00Z",
  last_login_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test("login stores the session and goes to the requested page", async () => {
  (api.login as jest.Mock).mockResolvedValue({ token: "tok-123", user: USER });
  render(<AuthProvider><LoginPage /></AuthProvider>);
  await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "secret123");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/admin"));
  expect(api.login).toHaveBeenCalledWith("alice@example.com", "secret123");
  expect(localStorage.getItem("mfc_user_token")).toBe("tok-123");
});

test("login shows the server error without the status code", async () => {
  (api.login as jest.Mock).mockRejectedValue(new Error("401: Wrong email or password"));
  render(<AuthProvider><LoginPage /></AuthProvider>);
  await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "badpass12");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Wrong email or password")).toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
});

test("members page lists members and toggles premium", async () => {
  (api.adminListUsers as jest.Mock).mockResolvedValue([USER]);
  (api.adminSetService as jest.Mock).mockResolvedValue({ ...USER, services: ["premium"] });
  render(<MembersPage />);
  expect(await screen.findByText("Alice")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "+ Premium" }));
  await waitFor(() => expect(api.adminSetService).toHaveBeenCalledWith("admin-token", 7, "premium", true));
  expect(await screen.findByRole("button", { name: "✓ Premium" })).toBeInTheDocument();
});
