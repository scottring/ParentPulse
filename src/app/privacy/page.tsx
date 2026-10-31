import Link from "next/link";
export const dynamic = "force-dynamic";
export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 780,
        margin: "50px auto",
        padding: "24px",
        lineHeight: 1.8,
      }}
    >
      <Link href="/relish/">← Back to Relish</Link>
      <h1>Your words belong to you.</h1>
      <p>Relish’s data practices · October 31, 2026</p>
      <h2>Your private editions</h2>
      <p>
        Your writing, people, session progress, games and sharing private keys
        are encrypted in this browser with your edition’s passphrase. Relish’s
        servers do not receive the complete book or its passphrase. Edition
        names on the device’s bookshelf and your sound preference are stored
        without encryption.
      </p>
      <p>
        An unlocked book can be read on that device. Device security, browser
        extensions and anyone with your passphrase affect that protection.
        Clearing browser data removes its local books. Relish cannot recover a
        lost passphrase; export encrypted backups regularly and keep the
        passphrase separately.
      </p>
      <h2>Children’s editions</h2>
      <p>
        Online accounts and connected-edition features are intended for adults
        aged 18 and older. Children can keep separate encrypted local editions
        and take part in family games without an online account. A parent or
        guardian explicitly chooses an age range: under 6, 6–8, 9–12 or 13–17.
        It is stored inside the encrypted edition, not sent to Relish’s servers.
        Relish does not infer or verify anyone’s age. Written prompts and
        session guidance adapt to the chosen range. Existing writing is not
        automatically reviewed or filtered by this setting.
      </p>
      <p>
        Children’s editions cannot open AI, online sign-in or online passage
        sharing. This applies to local AI too. A separate parent passphrase
        protects age changes and switching to an adult edition. Only a salted
        verifier is kept inside the encrypted book and its backups; Relish
        cannot recover that passphrase. These are app controls, not device-wide
        parental controls or age verification. Someone controlling the browser
        or able to alter a decrypted backup can bypass local settings. Use a
        parent-managed device where stronger restrictions are needed. Under 6, a
        grown-up should read and choose together with the child.
      </p>
      <h2>Optional connected editions</h2>
      <p>
        Signing in uses Firebase Authentication to store your email and
        authentication records. Connecting an edition publishes its name and
        public sharing key. The service stores family membership, invitation
        records, delivery choices, usage counters and encrypted selected
        passages in Google Cloud Firestore. Family members can see each other’s
        edition names and public sharing keys.
      </p>
      <p>
        Only a passage you explicitly select is encrypted in your browser for
        its chosen recipients and uploaded. A recipient chooses whether to keep
        a decrypted copy in their own encrypted edition. Accepting or declining
        removes that recipient’s encrypted delivery packet. Withdrawing an
        invitation removes remaining delivery packets. These actions cannot
        erase copies recipients already kept. Leaving a family ends access to
        its pending invitations.
      </p>
      <p>
        Online account sessions stay in memory and end when you reload, lock
        your book or enter shared play. The private book remains usable without
        signing in. Restore an encrypted backup to carry an edition and its
        private sharing key to another device; private books do not
        automatically synchronize.
      </p>
      <h2>Optional AI</h2>
      <p>
        AI receives only the excerpt you review and choose to send. Hosted AI
        passes it through Relish’s server to OpenAI. Relish does not store the
        excerpt or response on its server. Requests disable response storage;
        the provider’s abuse-monitoring retention may still apply. Responses are
        possibilities for reflection, not a diagnosis or a judgment about
        another person.
      </p>
      <p>
        <a
          href="https://developers.openai.com/api/docs/guides/your-data"
          rel="noreferrer"
        >
          OpenAI data controls
        </a>{" "}
        ·{" "}
        <a href="https://firebase.google.com/support/privacy" rel="noreferrer">
          Firebase privacy information
        </a>
      </p>
      <p>
        When running Relish locally with a verified local Ollama model, the
        selected excerpt can stay on that computer.
      </p>
      <h2>Family play</h2>
      <p>
        Pass-and-play games work on one device. Select an age range for each
        participant; an unspecified age uses the simplest prompts. New rounds
        use the youngest selected range and never exceed a child edition’s own
        range. These game settings remain in the encrypted book. Existing saved
        games retain their original wording. Players can pass, and every
        selected player must approve before a game passage is kept. These are
        in-person choices, not separately authenticated signatures. Shared play
        puts private pages away and returning to a private edition requires its
        passphrase.
      </p>
      <h2>Storage and control</h2>
      <p>
        Export an encrypted backup from Privacy and settings. Use Connected
        editions to withdraw invitations, leave a family or delete your online
        account. Account deletion removes authentication, membership, sent
        passages, remaining received delivery packets and individual usage
        records. It cannot erase recipients’ local copies or hosting providers’
        operational logs. Remove a local edition separately in Privacy and
        settings after exporting a backup if desired. Saved local editions and
        copies kept by other people remain under their control. Relish does not
        use advertising trackers or load remote fonts in the living-book
        experience. Hosting and authentication services may retain operational
        security logs under their own policies.
      </p>
    </main>
  );
}
