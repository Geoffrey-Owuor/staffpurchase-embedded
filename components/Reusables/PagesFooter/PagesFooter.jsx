import ThemeToggle from "../ThemeProviders/ThemeToggle";

const PagesFooter = () => {
  return (
    <div className="relative border-t border-gray-100 px-10 py-10 dark:border-gray-800">
      {/* Centered Part */}
      <div className="absolute inset-0 top-0 flex items-center justify-center space-x-1 text-sm md:top-5">
        <span className="text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Hotpoint Appliances Ltd.
        </span>
      </div>

      {/* ThemeToggle pinned right */}
      <div className="absolute top-14 right-10 hidden -translate-y-1/2 sm:block">
        <ThemeToggle />
      </div>
    </div>
  );
};

export default PagesFooter;
