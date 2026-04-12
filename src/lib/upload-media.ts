import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { JournalMedia } from '@/types/journal';

interface UploadOptions {
  familyId: string;
  entryId: string;
  file: File;
  onProgress?: (percent: number) => void;
}

// Upload a file to Firebase Storage under the journal entry's path.
// Returns a JournalMedia object ready to be stored on the entry doc.
export async function uploadEntryMedia({
  familyId,
  entryId,
  file,
  onProgress,
}: UploadOptions): Promise<JournalMedia> {
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${Date.now()}.${ext}`;
  const storagePath = `families/${familyId}/journal_entries/${entryId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          const type: JournalMedia['type'] = file.type.startsWith('audio/')
            ? 'audio'
            : 'image';
          resolve({
            url,
            type,
            filename: file.name,
            mimeType: file.type,
            storagePath,
          });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}
