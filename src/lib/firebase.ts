import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestoreDbId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  'ai-studio-barobonhsonlinem-e88f7c7e-39eb-49ba-8458-fb4adb037d52';

// Suppress noisy internal WebChannel timeout console.error logs when operating in offline-first or restricted network environments
setLogLevel('silent');

const initDb = () => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      firestoreDbId
    );
  } catch {
    return getFirestore(app, firestoreDbId);
  }
};

export const db = initDb();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

const createGoogleProvider = (forceConsent = false) => {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));
  if (forceConsent) {
    provider.setCustomParameters({ prompt: 'consent' });
  }
  return provider;
};

// In-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleDriveSignIn = async (
  forceConsent = false
): Promise<{
  user: FirebaseUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider(forceConsent);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      return null;
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = error?.message || '';
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-blocked' ||
      msg.includes('popup-closed-by-user')
    ) {
      return null;
    }
    console.warn('Google Drive sign-in warning:', error);
    return null;
  } finally {
    isSigningIn = false;
  }
};

export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
};

export const getGoogleDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleDriveLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  folderId?: string | null;
  folderWebViewLink?: string | null;
}

const isDemoPlaceholderId = (id: string): boolean => {
  const lower = id.toLowerCase();
  return lower.startsWith('1bnhs-') || lower.startsWith('bnhs-');
};

export const extractDriveFolderId = (urlOrId?: string): string | null => {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    if (isDemoPlaceholderId(folderMatch[1])) return null;
    return folderMatch[1];
  }
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    if (isDemoPlaceholderId(idParamMatch[1])) return null;
    return idParamMatch[1];
  }
  const fileDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    if (isDemoPlaceholderId(fileDMatch[1])) return null;
    return fileDMatch[1];
  }
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed) && !isDemoPlaceholderId(trimmed)) {
    return trimmed;
  }
  return null;
};

const resolveTargetDriveFolderId = async (
  rawId: string | null,
  token: string
): Promise<string | null> => {
  if (!rawId) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        rawId
      )}?supportsAllDrives=true&fields=id,name,mimeType,parents`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      return rawId;
    }
    const meta = await res.json();
    if (meta.mimeType === 'application/vnd.google-apps.folder') {
      return meta.id || rawId;
    }
    if (Array.isArray(meta.parents) && meta.parents.length > 0) {
      return meta.parents[0];
    }
    return rawId;
  } catch {
    return rawId;
  }
};

const tokenHasFullDriveScope = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return false;
    const info = await res.json();
    const scopes: string = info.scope || '';
    return scopes.split(' ').includes('https://www.googleapis.com/auth/drive');
  } catch {
    return true;
  }
};

export const uploadFileToGoogleDrive = async (
  file: File,
  options?: {
    accessToken?: string;
    folderUrl?: string;
    description?: string;
  }
): Promise<DriveUploadResult> => {
  const token = options?.accessToken || cachedAccessToken;
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const performMultipartRelatedUpload = async (folderId?: string | null): Promise<Response> => {
    const metadata: Record<string, unknown> = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
    if (options?.description) {
      metadata.description = options.description;
    }
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------bnhs_omes_drive_upload_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataHeader =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

    const multipartBody = new Blob([metadataHeader, file, closeDelimiter], {
      type: `multipart/related; boundary=${boundary}`,
    });

    return fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,parents',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );
  };

  const extractedId = extractDriveFolderId(options?.folderUrl);
  const candidateFolderId = await resolveTargetDriveFolderId(extractedId, token);

  const response = await performMultipartRelatedUpload(candidateFolderId);

  if (response.status === 401) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 403 || response.status === 404) {
      const hasDriveScope = await tokenHasFullDriveScope(token);
      if (!hasDriveScope || errText.includes('insufficientPermissions')) {
        cachedAccessToken = null;
        throw new Error('INSUFFICIENT_SCOPE');
      }
      if (candidateFolderId) {
        throw new Error(
          `Google Drive could not save to folder (${candidateFolderId}). Please ensure your signed-in Google account (${auth.currentUser?.email || 'current account'}) has "Editor" access to that Google Drive folder.`
        );
      }
    }
    throw new Error(`Google Drive upload failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const fileId: string = data.id;
  const fileName: string = data.name || file.name;
  const webViewLink: string =
    data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  const folderWebViewLink = candidateFolderId
    ? `https://drive.google.com/drive/folders/${candidateFolderId}`
    : null;

  return {
    fileId,
    fileName,
    webViewLink,
    folderId: candidateFolderId,
    folderWebViewLink,
  };
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };

  const isOfflineOrTransient =
    message.includes('the client is offline') ||
    message.includes('Could not reach Cloud Firestore backend') ||
    message.includes('unavailable') ||
    message.includes('Failed to get document because the client is offline');

  if (!isOfflineOrTransient) {
    console.warn('Firestore Notice: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

// Test initial connection gracefully with cache fallback
async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch {
    // Client will seamlessly operate in offline/cached mode until connection is restored
  }
}

testConnection();

