import PublishForm from "./PublishForm";

export const metadata = { title: "Publish a ride" };

export default function PublishPage() {
  return (
    <>
      <section className="bg-[linear-gradient(160deg,#054752,#0a5d6b)] py-12 text-white">
        <div className="wrap">
          <span className="eyebrow text-green">Become a driver</span>
          <h1 className="mt-2 max-w-[640px] text-[clamp(24px,4vw,34px)] font-bold leading-tight">
            Publish a ride and share your travel costs
          </h1>
          <p className="mt-3 max-w-[560px] text-lg text-[#cfe9ee]">
            Heading somewhere with empty seats? Fill in your trip and we’ll match you with passengers going your way.
          </p>
        </div>
      </section>

      <PublishForm />
    </>
  );
}
