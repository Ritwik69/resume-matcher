import LoginForm from "@/components/LoginForm";

// searchParams lets us surface errors forwarded from the auth callback route
// e.g. /login?error=auth_callback_failed
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return <LoginForm callbackError={searchParams.error} />;
}
