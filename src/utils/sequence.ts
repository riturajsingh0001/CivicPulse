import { doc, runTransaction, getFirestore } from "firebase/firestore";
import { db } from "../firebase";

export async function getNextSequence(sequenceName: string, prefix: string, padLength: number): Promise<string> {
  const seqDocRef = doc(db, 'sequences', sequenceName);
  
  try {
    const newSeq = await runTransaction(db, async (transaction) => {
      const seqDoc = await transaction.get(seqDocRef);
      let nextValue = 1;
      
      if (seqDoc.exists()) {
        nextValue = (seqDoc.data().value || 0) + 1;
        transaction.update(seqDocRef, { value: nextValue });
      } else {
        transaction.set(seqDocRef, { value: nextValue });
      }
      
      return nextValue;
    });

    const paddedSeq = newSeq.toString().padStart(padLength, '0');
    return `${prefix}${paddedSeq}`;
  } catch (e) {
    console.error("Transaction failed: ", e);
    // Fallback: generate a random but somewhat sequential looking ID
    const randomFallback = Math.floor(Math.random() * 999999).toString().padStart(padLength, '0');
    return `${prefix}${randomFallback}`;
  }
}

export async function getOrAssignReporterId(userId: string): Promise<string> {
  const userDocRef = doc(db, 'users', userId);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (userDoc.exists() && userDoc.data().reporterId) {
        return userDoc.data().reporterId;
      }
      
      // If it doesn't exist, we need to get the next USR sequence
      const seqDocRef = doc(db, 'sequences', 'reporters');
      const seqDoc = await transaction.get(seqDocRef);
      let nextValue = 1;
      if (seqDoc.exists()) {
        nextValue = (seqDoc.data().value || 0) + 1;
        transaction.update(seqDocRef, { value: nextValue });
      } else {
        transaction.set(seqDocRef, { value: nextValue });
      }
      
      const reporterId = `USR-${nextValue.toString().padStart(3, '0')}`;
      
      if (!userDoc.exists()) {
         transaction.set(userDocRef, { reporterId });
      } else {
         transaction.update(userDocRef, { reporterId });
      }
      
      return reporterId;
    });
  } catch (e) {
    console.error("Failed to get reporter ID: ", e);
    return `USR-${userId.substring(0, 3).toUpperCase()}`;
  }
}
