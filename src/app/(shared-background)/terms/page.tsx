import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Card className="bg-background/40 border-primary/10 overflow-hidden rounded-lg border">
        <CardHeader className="pb-6 text-center">
          <CardTitle className="text-foreground text-3xl font-bold">
            Terms of Service
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Last updated: November 7, 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <div className="text-foreground/80 space-y-6">
            <section>
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Lorem Ipsum
              </h2>
              <p className="mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="mb-4">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
            </section>

            <section>
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Sed Ut Perspiciatis
              </h2>
              <p className="mb-4">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
                quae ab illo inventore veritatis et quasi architecto beatae
                vitae dicta sunt explicabo.
              </p>
              <p className="mb-4">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit
                aut fugit, sed quia consequuntur magni dolores eos qui ratione
                voluptatem sequi nesciunt.
              </p>
            </section>

            <section>
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Neque Porro
              </h2>
              <p className="mb-4">
                Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
                consectetur, adipisci velit, sed quia non numquam eius modi
                tempora incidunt ut labore et dolore magnam aliquam quaerat
                voluptatem.
              </p>
              <p className="mb-4">
                Ut enim ad minima veniam, quis nostrum exercitationem ullam
                corporis suscipit laboriosam, nisi ut aliquid ex ea commodi
                consequatur? Quis autem vel eum iure reprehenderit qui in ea
                voluptate velit esse quam nihil molestiae consequatur.
              </p>
            </section>

            <section>
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Contact Information
              </h2>
              <p className="mb-4">
                If you have any questions about these Terms of Service, please
                contact us at support@example.com.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
