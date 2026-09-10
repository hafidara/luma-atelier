import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell state-page">
      <h1>Page not found</h1>
      <Link href="/" className="button">
        Back to the shop
      </Link>
    </main>
  );
}
