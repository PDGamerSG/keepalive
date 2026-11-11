import { PolicyEditor } from "@/components/merchant/policy-editor";
import { PageHead } from "@/components/merchant/shell";
import { getPolicy } from "@/lib/retention/engine";

export default async function Guardrails() {
  return (
    <>
      <PageHead title="Guardrails" note="The limits every offer is checked against, and how the AI should speak for you" />
      <PolicyEditor initial={await getPolicy()} />
    </>
  );
}
