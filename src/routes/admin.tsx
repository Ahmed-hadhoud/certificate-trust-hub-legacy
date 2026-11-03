import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/lib/store";
import { CertificatesTab } from "@/components/admin/CertificatesTab";
import { DisputesTab } from "@/components/admin/DisputesTab";
import { CoursesTab } from "@/components/admin/CoursesTab";
import { PolicyTab } from "@/components/admin/PolicyTab";
import { EventsTab } from "@/components/admin/EventsTab";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Career-180 Trust Layer" },
      { name: "description", content: "Revoke certificates, review disputes, configure courses and publish policy." },
      { property: "og:title", content: "Admin · Career-180 Trust Layer" },
      { property: "og:description", content: "Manage the Career-180 certificate trust layer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const s = useAppState();
  const openDisputes = s.disputes.filter((d) => d.status === "open").length;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin · demo</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Trust layer admin</h1>
      <Tabs defaultValue="certificates" className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1 sm:w-fit">
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="disputes">
            Disputes{openDisputes > 0 && ` (${openDisputes})`}
          </TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>
        <TabsContent value="certificates" className="mt-5">
          <CertificatesTab s={s} />
        </TabsContent>
        <TabsContent value="disputes" className="mt-5">
          <DisputesTab s={s} />
        </TabsContent>
        <TabsContent value="courses" className="mt-5">
          <CoursesTab s={s} />
        </TabsContent>
        <TabsContent value="policy" className="mt-5">
          <PolicyTab s={s} />
        </TabsContent>
        <TabsContent value="events" className="mt-5">
          <EventsTab s={s} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
