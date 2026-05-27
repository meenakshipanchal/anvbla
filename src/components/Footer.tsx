import Link from "next/link";

export default function Footer() {
  return (
    <footer
      id="help"
      className="border-t border-line bg-sherpa pb-24 pt-5 text-[#cfe1e5] md:pb-6"
    >
      <div className="wrap flex flex-wrap items-center justify-between gap-2">
        <Link href="#" className="font-semibold text-white hover:text-green">
          Terms and Conditions
        </Link>
        <span className="text-[#9fc4cb]">BlaBlue, {new Date().getFullYear()} ©</span>
      </div>
    </footer>
  );
}
