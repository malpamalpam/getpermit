import { Container } from "@/components/ui/Container";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NotificationSettingsForm } from "@/components/admin/NotificationSettingsForm";
import { requireAdmin } from "@/lib/auth";
import { getNotificationSettings } from "@/lib/fdk-queries";

export const metadata = {
  title: "Ustawienia — Panel Admin",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireAdmin();
  const settings = await getNotificationSettings();

  return (
    <>
      <AdminHeader user={user} active="settings" />
      <Container className="py-8">
        <h1 className="mb-6 font-display text-3xl font-extrabold text-primary">Ustawienia</h1>
        <div className="max-w-2xl space-y-6">
          <NotificationSettingsForm
            initial={{
              teamNotifyFrequencyDays: settings.teamNotifyFrequencyDays,
              oswiadczenieDaysBefore: settings.oswiadczenieDaysBefore,
              zezwolenieDaysBefore: settings.zezwolenieDaysBefore,
              pobytDaysBefore: settings.pobytDaysBefore,
            }}
          />
        </div>
      </Container>
    </>
  );
}
