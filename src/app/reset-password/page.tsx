import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
