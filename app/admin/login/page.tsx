import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="mb-4 text-lg font-bold">Log ind</h1>
      <LoginForm />
    </div>
  );
}
