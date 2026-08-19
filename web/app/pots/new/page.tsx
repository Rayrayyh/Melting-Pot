import { UserShell } from "@/components/shell/user-shell";
import { CreatePotFlow } from "@/components/pots/create-pot-flow";

export const metadata = { title: "Create a Pot" };

export default function CreatePotPage() {
  return (
    <UserShell>
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <CreatePotFlow />
      </div>
    </UserShell>
  );
}
