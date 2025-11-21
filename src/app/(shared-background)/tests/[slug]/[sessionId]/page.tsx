import { notFound, redirect } from "next/navigation";
import {
  MainHeader,
  MainHeaderContentWrapper,
} from "@/components/landing/MainHeader";
import { Footer } from "@/components/landing/Footer";
import { TestTakingClient } from "@/components/test-taking/TestTakingClient";
import { getServerTRPC } from "@/server/api/caller";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function TestTakingPage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
}) {
  const { slug, sessionId } = await params;

  // Check authentication
  const headersList = await headers();
  const headersObj = new Headers();
  for (const [key, value] of headersList.entries()) {
    headersObj.set(key, value);
  }

  const session = await auth.api.getSession({ headers: headersObj });

  if (!session?.user) {
    redirect(`/login?redirect=/tests/${slug}/${sessionId}`);
  }

  const trpc = await getServerTRPC();

  // Get session data
  let sessionData;
  try {
    sessionData = await trpc.questionnaires.getSession({ sessionId });
  } catch {
    notFound();
  }

  // Verify session belongs to user (already checked in getSession, but double-check)
  if (sessionData.session.userId !== session.user.id) {
    redirect("/tests");
  }

  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <main className="mx-auto max-w-4xl px-4 pt-0 pb-8">
          <TestTakingClient
            sessionData={sessionData}
            sessionId={sessionId}
            slug={slug}
          />
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
