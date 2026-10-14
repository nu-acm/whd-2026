import { createFileRoute } from '@tanstack/react-router';
import { ContactLink, LegalPage, LegalSection } from '@/components/LegalPage';
import { CONTACT_EMAIL } from '@/lib/event';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: 'Privacy Policy — Women’s Hack Day' },
      {
        name: 'description',
        content:
          'Privacy policy for Women’s Hack Day — how we collect, use and protect your personal data.',
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <LegalSection title="1. Who we are">
        <p>
          Women’s Hack Day is an annual team competition organized by the NU ACM-W Student Chapter
          at Nazarbayev University, Astana, Kazakhstan. This policy applies to the Women’s Hack Day
          website and registration platform at whd.nuacmw.kz.
        </p>
      </LegalSection>

      <LegalSection title="2. Data we collect">
        <p className="mb-2">When you register, we collect and process:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="text-foreground">Account data:</strong> your email address, and your
            name and profile picture if you sign in with Google.
          </li>
          <li>
            <strong className="text-foreground">Registration data:</strong> full name, IIN
            (individual identification number), phone number, city, place of study, level of study,
            and a parent or guardian’s phone number for school students.
          </li>
          <li>
            <strong className="text-foreground">Team data:</strong> your team’s name and members.
          </li>
          <li>
            <strong className="text-foreground">Attendance:</strong> whether you checked in at the
            event.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use your data">
        <ul className="list-inside list-disc space-y-1">
          <li>To verify your identity and manage your registration</li>
          <li>To organize teams and communicate event logistics</li>
          <li>To check you in at the venue</li>
          <li>To share participant information with partners where the event requires it</li>
          <li>To comply with legal obligations and keep the event safe</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Minors">
        <p>
          School students taking part are usually under 18. We ask for a parent or guardian’s phone
          number so we can reach them about the event.
        </p>
      </LegalSection>

      <LegalSection title="5. Legal basis and consent">
        <p>
          We process your data based on the consent you give when you register. You may withdraw
          consent at any time by contacting us; this may affect your ability to take part in the
          event.
        </p>
      </LegalSection>

      <LegalSection title="6. Storage and security">
        <p>
          Your data is stored on Cloudflare’s infrastructure (Cloudflare D1) and transmitted over
          HTTPS. Organizers may export registration data to spreadsheets under our organization’s
          control. We do not sell your data.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention">
        <p>
          We keep your data for the duration of the event and a reasonable period afterwards for
          administrative purposes. You may ask us to delete it at any time.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>
          Under the Law of the Republic of Kazakhstan on Personal Data and Its Protection, you have
          the right to access, correct, block or delete your personal data. To exercise these
          rights, contact us at the address below.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          For questions about this policy or your data, contact the NU ACM-W Student Chapter at{' '}
          <ContactLink email={CONTACT_EMAIL} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
