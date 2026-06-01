import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/lg_cgi_color.png"
            alt="CGI"
            className="h-full w-full object-contain"
          />
        </span>
        <h1 className="mb-0.5 text-base font-semibold text-fg">
          Suivi Projets : BT-IA
        </h1>
        <p className="mb-8 text-sm text-muted">CGI · Unité AT</p>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-fg px-4 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-80"
          >
            Se connecter avec GitHub
          </button>
        </form>

        <p className="mt-4 text-[11px] text-faint">
          Réservé aux membres de l&apos;équipe AT autorisés.
        </p>
      </div>
    </div>
  );
}
