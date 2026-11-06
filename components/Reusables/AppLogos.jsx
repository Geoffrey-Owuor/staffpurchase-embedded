import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import hat from "@/public/hat.png";
import { basePath } from "@/utils/basePath";

// The seasonal Christmas hat, for the commented-out <Image> in these logos and
// in HotpointLogo.jsx
export const assets = { hat };

export const AuthPagesLogo = () => {
  return (
    <Link href="/">
      <div className="relative flex items-center gap-1 text-2xl font-semibold">
        {/* <Image
          src={assets.hat}
          alt="christmas hat"
          className="absolute bottom-1.5 left-6.5 w-7 sm:bottom-1"
        />*/}
        <ShoppingBag className="h-6 w-6 text-gray-950 dark:text-white" />
        <span className="mt-1 text-gray-900 sm:mt-0 dark:text-gray-100">
          Hot<span className="text-red-600 dark:text-red-500">p</span>oint
        </span>
      </div>
    </Link>
  );
};

export const LandingPageLogo = () => {
  return (
    <a href={`${basePath}#`}>
      <div className="relative flex items-center gap-1 text-2xl font-semibold">
        {/* <Image
          src={assets.hat}
          alt="christmas hat"
          className="absolute bottom-1.5 left-6.5 w-7 sm:bottom-1"
        />*/}
        <ShoppingBag className="h-6 w-6 text-gray-950 dark:text-white" />
        <span className="mt-1 text-gray-900 sm:mt-0 dark:text-gray-100">
          Hot<span className="text-red-600 dark:text-red-500">p</span>oint
        </span>
      </div>
    </a>
  );
};
