import { Suspense } from "react";
import FileExplorer from "../files/explorer";

export default function CareCoreCloudPage() {
  return (
    <Suspense fallback={null}>
      <FileExplorer scope="personal" />
    </Suspense>
  );
}
