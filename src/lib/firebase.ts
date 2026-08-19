import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, PunchRecord, CompanySettings } from '../types';
import { getSaoPauloDateKey, formatSaoPauloDateTime } from './timeUtils';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app must use firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Error Handling Enum & Interface conforming to Firebase Integration Skill
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'companySettings', 'test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or network is disconnected.");
    }
    return false;
  }
}

// -------------------------------------------------------------
// Seed Initial Admin
// -------------------------------------------------------------
const INITIAL_ADMIN_ID = 'admin-user-01';

export async function seedInitialAdmin(): Promise<User> {
  const adminDocRef = doc(db, 'users', INITIAL_ADMIN_ID);
  
  try {
    const docSnap = await getDoc(adminDocRef);
    if (!docSnap.exists()) {
      const adminUser: User = {
        id: INITIAL_ADMIN_ID,
        username: 'admin',
        name: 'Administrador SkyPoint',
        role: 'admin',
        department: 'Diretoria / RH',
        cpf: '000.000.000-00',
        password: 'admin@123',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(adminDocRef, adminUser);
      return adminUser;
    }
    return docSnap.data() as User;
  } catch (error) {
    console.warn("Could not seed in Firestore, fallbacking to local storage admin:", error);
    // Local fallback in case network is initialising
    const localAdmin: User = {
      id: INITIAL_ADMIN_ID,
      username: 'admin',
      name: 'Administrador SkyPoint',
      role: 'admin',
      department: 'Diretoria / RH',
      cpf: '000.000.000-00',
      password: 'admin@123',
      active: true,
      createdAt: new Date().toISOString()
    };
    return localAdmin;
  }
}

// -------------------------------------------------------------
// User Management Functions
// -------------------------------------------------------------
export async function fetchAllUsers(): Promise<User[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });

    // Ensure initial admin is in the list
    if (!users.some(u => u.username === 'admin')) {
      const admin = await seedInitialAdmin();
      users.unshift(admin);
    }
    return users;
  } catch (error) {
    console.warn("Failed fetching users from Firestore, using local fallback:", error);
    const local = localStorage.getItem('skypoint_users_cache');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
    const admin = await seedInitialAdmin();
    return [admin];
  }
}

export async function createNewUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const newUser: User = {
    ...userData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'users', newId), newUser);
    return newUser;
  } catch (error) {
    console.error("Firestore user creation error:", error);
    handleFirestoreError(error, OperationType.CREATE, `users/${newId}`);
  }
}

export async function updateUserRecord(id: string, updates: Partial<User>): Promise<void> {
  try {
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Firestore update user error:", error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
  }
}

export async function deleteUserRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    console.error("Firestore delete user error:", error);
    handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
  }
}

// -------------------------------------------------------------
// Punch Record Management
// -------------------------------------------------------------
export async function savePunchRecordToFirestore(record: Omit<PunchRecord, 'id'>): Promise<PunchRecord> {
  const newId = 'punch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const fullRecord: PunchRecord = {
    ...record,
    id: newId,
  };

  try {
    await setDoc(doc(db, 'punchRecords', newId), fullRecord);
    return fullRecord;
  } catch (error) {
    console.error("Firestore punch record save error:", error);
    handleFirestoreError(error, OperationType.CREATE, `punchRecords/${newId}`);
  }
}

export async function updatePunchRecordInFirestore(id: string, updates: Partial<PunchRecord>): Promise<void> {
  try {
    const recordRef = doc(db, 'punchRecords', id);
    await updateDoc(recordRef, updates);
  } catch (error) {
    console.error("Firestore punch update error:", error);
    handleFirestoreError(error, OperationType.UPDATE, `punchRecords/${id}`);
  }
}

export async function deletePunchRecordFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'punchRecords', id));
  } catch (error) {
    console.error("Firestore punch delete error:", error);
    handleFirestoreError(error, OperationType.DELETE, `punchRecords/${id}`);
  }
}

export async function fetchPunchRecords(): Promise<PunchRecord[]> {
  try {
    const q = query(collection(db, 'punchRecords'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const records: PunchRecord[] = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as PunchRecord);
    });
    return records;
  } catch (error) {
    console.warn("Firestore fetch punches fallbacking:", error);
    return [];
  }
}

export function subscribeToPunchRecords(onUpdate: (records: PunchRecord[]) => void) {
  try {
    const q = query(collection(db, 'punchRecords'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const records: PunchRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as PunchRecord);
      });
      onUpdate(records);
    }, (error) => {
      console.warn("onSnapshot error:", error);
      handleFirestoreError(error, OperationType.GET, 'punchRecords');
    });
  } catch (err) {
    console.warn("Could not setup realtime listener:", err);
    return () => {};
  }
}
