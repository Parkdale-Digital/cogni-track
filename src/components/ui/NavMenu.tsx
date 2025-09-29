
import Link from "next/link";

export function NavMenu() {
  return (
    <nav className="flex items-center space-x-4">
      <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
        Home
      </Link>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
      >
        Dashboard
      </Link>
      <Link
        href="/analytics"
        className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
      >
        Analytics
      </Link>
    </nav>
  );
}
