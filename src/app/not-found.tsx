import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F7F1] p-6 md:p-10 flex items-center justify-center">
      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000] text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-3xl font-black mb-2">Page Not Found</h1>
        <p className="text-base font-medium text-gray-700 mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#6EE0FF] border-4 border-black font-black shadow-[6px_6px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#000] transition-all duration-150"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
