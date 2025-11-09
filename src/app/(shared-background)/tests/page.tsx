import {
  MainHeader,
  MainHeaderContentWrapper,
} from "@/components/landing/MainHeader";
import { Footer } from "@/components/landing/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TestsPage() {
  return (
    <>
      <MainHeader />
      <MainHeaderContentWrapper>
        <main className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Tests Catalog
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Choose from our selection of validated personality assessments
            </p>
          </div>
          <Card className="bg-background/40 border-primary/10 mt-12">
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                The full tests catalog is being prepared. Check back soon!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                In the meantime, you can explore our DISC test from the landing
                page.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </MainHeaderContentWrapper>
    </>
  );
}
