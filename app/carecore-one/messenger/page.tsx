import { Suspense } from "react";
import MessagesWorkspace from "@/app/personal/team/components/messages-workspace";

export default function CareCoreOneMessengerPage() {
  // Der Messenger liest ?conversation= (useSearchParams), das braucht auf einer statischen Seite eine Suspense-Grenze.
  return (
    <Suspense fallback={null}>
      <MessagesWorkspace />
    </Suspense>
  );
}
