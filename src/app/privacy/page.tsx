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
      <p>Relish’s data practices · November 1, 2026</p>
      <h2>Your account library</h2>
      <p>
        One verified adult account owns your family library. Account books,
        including entries, photos, people, progress, games and manual
        suggestions, save automatically to Google Cloud Firestore. Sign in to
        the same account on another device to open them without a separate book
        passphrase.
      </p>
      <p>
        Books and photos are encrypted in the browser before upload. For
        account-managed books, Relish also stores a random recovery secret in a
        separate restricted database collection, accessible through the
        authenticated owner’s account. Database storage and connections are
        protected by the provider. This is account-based protection, not
        end-to-end or zero-knowledge encryption: the account and service can
        recover these books. Anyone signed into the parent account can access
        its books. Other accounts cannot retrieve them.
      </p>
      <p>
        Edition names, identifiers, revisions, sizes and usage counters are also
        stored. Changes save on the device first and then upload automatically
        while connected and signed in. The save indicator distinguishes account
        saves from changes waiting on this device. If devices edit the same
        version, Relish keeps separate copies for review instead of silently
        overwriting either one.
      </p>
      <h2>Children’s profiles</h2>
      <p>
        Children have profiles inside a parent-managed account, without separate
        email addresses or sign-in credentials. A parent chooses their name and
        age range: under 6, 6–8, 9–12 or 13–17. Prompts, games and session
        guidance adapt to that range. Relish does not infer or verify age, and
        existing writing is not automatically reviewed or filtered.
      </p>
      <p>
        The parent account can access its children’s entries and photos on other
        devices. Returning from a child’s book to the family library and
        changing age settings requires parent confirmation with the parent
        account password. These are shared-device app safeguards, not
        independent child authentication or device-wide parental controls. Use a
        parent-managed device where stronger restrictions are needed. Under 6,
        read and choose together.
      </p>
      <p>
        Children cannot create independent online accounts or share passages
        online. General AI chat and local Ollama remain unavailable in
        children’s editions. Assisted voice and manual suggestions require a
        verified adult account, parent authorization and explicit permission for
        that visit. Children’s automatic manual suggestions additionally require
        verified provider Zero Data Retention. Saving a book online does not
        authorize AI analysis.
      </p>
      <h2>Local-only and earlier books</h2>
      <p>
        You can explicitly choose a local-only book instead. Its passphrase and
        decryption key stay on your device. Relish cannot recover a forgotten
        local passphrase. Earlier passphrase-protected synced books continue to
        require their original passphrase. Opening a local or earlier book does
        not upload or convert it automatically: choose “Add this book to my
        account” to make an account-managed copy of its entries and photos. The
        original remains intact.
      </p>
      <p>
        An unlocked book can be read on that device. Device security, browser
        extensions and anyone using a signed-in account affect protection.
        Clearing browser data removes local copies and pending offline changes;
        already saved account books remain online. Local-only books need
        exported backups. When exporting an account book, choose an independent
        backup passphrase; for a child’s restored backup, this also protects its
        parent settings. Keep the passphrase separately.
      </p>
      <p>
        Account deletion removes saved books, photos and recovery secrets.
        Minimal content-free deletion markers prevent late requests from
        recreating deleted storage. Local copies and backups are separate.
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
        Your account stays signed in across reloads on this browser until you
        sign out or lock Relish. Use a device you trust. Shared play puts
        private pages and AI permissions away; returning through Lock signs out.
        Child views retain a parent gate across reloads. Signing out never
        deletes entries already saved to the account. Local-only books remain
        usable without signing in.
      </p>
      <h2>Optional AI</h2>
      <p>
        The on-demand perspective tool receives only the excerpt you review and
        choose to send. Hosted AI passes it through Relish’s server to OpenAI.
        Relish does not store the excerpt or response on its server. Requests
        disable response storage; the provider’s abuse-monitoring retention may
        still apply. Responses are possibilities for reflection, not a diagnosis
        or a judgment about another person.
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
      <h2>Voice, photos and your living manual</h2>
      <p>
        Voice writing records only after you start it. You review a take before
        sending it through Relish to OpenAI for transcription, then review and
        edit the words before adding them to your page. Audio remains in memory
        for that visit and is not included in your book or backup. Relish does
        not persist recordings or transcripts on its server. OpenAI documents no
        abuse-monitoring or application retention for the audio transcription
        endpoint under standard API controls. This is distinct from project-wide
        Zero Data Retention.
      </p>
      <p>
        Photos are resized and re-encoded in your browser to remove embedded
        metadata, then encrypted on this device. They are not sent to AI. Your
        encrypted backup includes the photos referenced by your pages and album.
        Private people tags do not notify anyone or grant access. Only the words
        and photos you explicitly choose appear in the Family album on this
        device. Online passage sharing carries selected text only.
      </p>
      <p>
        Automatic manual suggestions are off by default. After an adult connects
        the guide for a visit, each manual has its own opt-in switch. The
        personal manual uses up to six recent kept pages, including accepted
        passages with attribution. The Family manual uses only approved Family
        album and game passages. Requests include at most 1,800 characters per
        page; drafts, photos, captions and private people tags are excluded.
        Suggestions cite their sources and become kept manual entries only when
        you approve them. Adult automatic analysis uses standard API privacy: no
        model training by default, response storage disabled, and possible
        abuse-monitoring retention for up to 30 days. Do not include personal
        information about children under 13 (or the local age of digital
        consent) in those automatic reflections. Children’s automatic analysis
        remains unavailable until provider Zero Data Retention is verified.
        Analysis stops when you disconnect, lock or enter shared time.
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
        puts private pages away. Returning to an account book requires signing
        back in; local-only books require their passphrase.
      </p>
      <h2>Storage and control</h2>
      <p>
        Export an encrypted backup from Privacy and settings. Use Connected
        editions to withdraw invitations, leave a family or delete your online
        account. Account deletion removes authentication, membership, sent
        passages, remaining received delivery packets, synced book contents and
        individual usage records. It cannot erase recipients’ local copies or
        hosting providers’ operational logs. Remove a local edition separately
        in Privacy and settings after exporting a backup if desired. Saved local
        editions and copies kept by other people remain under their control.
        Relish does not use advertising trackers or load remote fonts in the
        living-book experience. Hosting and authentication services may retain
        operational security logs under their own policies.
      </p>
    </main>
  );
}
