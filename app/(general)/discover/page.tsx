import { redirect, RedirectType } from "next/navigation";

export default function DiscoverPage() {
    redirect("/discover/upcoming", RedirectType.replace);
}
