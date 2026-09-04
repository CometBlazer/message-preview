import { StoreProvider } from "@/lib/store";
import Workbench from "@/components/Workbench";

export default function Page() {
  return (
    <StoreProvider>
      <Workbench />
    </StoreProvider>
  );
}
