import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface UploadOptions {
  familyId: string;
  personId: string;
  kind: 'avatar' | 'banner';
  file: File;
  onProgress?: (percent: number) => void;
}

export async function uploadPersonImage({
  familyId,
  personId,
  kind,
  file,
  onProgress,
}: UploadOptions): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const filename = `${kind}-${Date.now()}.${ext}`;
  const storagePath = `families/${familyId}/people/${personId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

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
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}
