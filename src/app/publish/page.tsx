import PublishForm from "./PublishForm";

export const metadata = { title: "Publish a ride" };

/* Publish flow runs as a step-by-step wizard. The page wrapper stays minimal
   on purpose so the active step is the only thing in view — same idea as
   BlaBlaCar's mobile flow. The big marketing header that used to live here
   was pushing the form below the fold on mobile. */
export default function PublishPage() {
  return (
    <div className="pb-10">
      <header className="border-b border-line bg-white py-4">
        <div className="wrap">
          <h1 className="font-bold">Publish a ride</h1>
        </div>
      </header>
      <PublishForm />
    </div>
  );
}
