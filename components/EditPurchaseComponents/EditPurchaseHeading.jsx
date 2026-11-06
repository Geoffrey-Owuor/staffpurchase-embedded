import { FileSliders } from "lucide-react";
import TopBarButtons from "../Reusables/TopBarButtons/TopBarButtons";
import StickyPageHeader from "../Reusables/StickyPageHeader";

export default function EditPurchaseHeading({ action }) {
  return (
    <>
      <StickyPageHeader className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <FileSliders className="h-6 w-6 text-gray-900 dark:text-white" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Request
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <TopBarButtons />
        </div>
      </StickyPageHeader>
    </>
  );
}
