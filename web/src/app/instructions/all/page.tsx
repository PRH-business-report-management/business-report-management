import { redirect } from "next/navigation";

/** 旧 URL 互換: 一覧は /instructions に統一 */
export default function InstructionsAllRedirectPage() {
  redirect("/instructions");
}
