import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PRIVACY_POLICY_LAST_UPDATED = "November 7, 2024";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Card className="bg-background/40 border-primary/10 overflow-hidden rounded-lg border">
        <CardHeader className="pb-6 text-center">
          <CardTitle className="text-foreground text-3xl font-bold">
            Privacy Policy
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Last updated: {PRIVACY_POLICY_LAST_UPDATED}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <div className="text-foreground/80 space-y-6">
            <section>
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Information We Collect
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
                How We Use Your Information
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
                Data Security
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
                Your Rights
              </h2>
              <p className="mb-4">
                At vero eos et accusamus et iusto odio dignissimos ducimus qui
                blanditiis praesentium voluptatum deleniti atque corrupti quos
                dolores et quas molestias excepturi sint occaecati cupiditate
                non provident.
              </p>
              <p className="mb-4">
                Similique sunt in culpa qui officia deserunt mollitia animi, id
                est laborum et dolorum fuga. Et harum quidem rerum facilis est
                et expedita distinctio.
              </p>
            </section>

            <section>
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Contact Us
              </h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy, please
                contact us at privacy@example.com.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
