import { createFileRoute } from '@tanstack/react-router';
import { ContactLink, LegalPage, LegalSection } from '@/components/LegalPage';
import { CONTACT_EMAIL } from '@/lib/event';
import { pageMetadata } from '@/lib/metadata';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  head: () => ({
    meta: pageMetadata(
      'Terms of Service | Women’s Hack Day 2026',
      'Rules and conditions for registering for Women’s Hack Day 2026 and using the event platform.',
    ),
  }),
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2, 2026">
      <LegalSection title="1. Acceptance of terms">
        <p>
          By registering for Women’s Hack Day and using this platform (whd.nuacmw.kz), you agree to
          these Terms of Service. If you do not agree, please do not use the registration system.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          Women’s Hack Day is a team competition for school, college and university students. You
          must meet the eligibility criteria published by the organizers to take part. Participation
          is subject to verification by the organizers. Participants who will be under 18 on
          November 14, 2026 must provide a parent or guardian contact number. A contact is also
          required if the IIN does not contain a usable birth date for the age check.
        </p>
      </LegalSection>

      <LegalSection title="3. Registration and accuracy">
        <p>
          You agree to provide accurate, complete and up-to-date information during registration.
          False or misleading information may result in disqualification or removal from the event.
        </p>
      </LegalSection>

      <LegalSection title="4. Teams">
        <p>
          Teams must have exactly 3 members to compete. A team of any other size at the end of
          registration is not eligible. The team captain may remove members while registration is
          open.
        </p>
      </LegalSection>

      <LegalSection title="5. Code of conduct">
        <p>
          All participants must follow the event’s rules and any instructions from the organizers.
          Harassment, cheating or disruptive behaviour will not be tolerated and may result in
          immediate removal from the event.
        </p>
      </LegalSection>

      <LegalSection title="6. Intellectual property">
        <p>
          Work you create during Women’s Hack Day remains yours. By participating, you grant the
          organizers a non-exclusive licence to showcase, promote and document it for event-related
          purposes.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of liability">
        <p>
          The NU ACM-W Student Chapter and the Women’s Hack Day organizers are not liable for any
          loss, damage or inconvenience arising from your use of this platform or participation in
          the event. The platform is provided “as is” without warranties of any kind.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes">
        <p>
          We may update these terms from time to time. Continued use of the platform after changes
          constitutes acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          For questions about these terms, contact the NU ACM-W Student Chapter at{' '}
          <ContactLink email={CONTACT_EMAIL} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
