import { Suspense } from "react";
import { AuthForm } from "@/features/auth";

export const metadata = { title: "xor" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="forgot" />
    </Suspense>
  );
}

